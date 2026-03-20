-- Free spin sessions table
CREATE TABLE IF NOT EXISTS free_spin_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  remaining SMALLINT NOT NULL CHECK (remaining >= 0 AND remaining <= 10),
  accumulated INTEGER NOT NULL DEFAULT 0 CHECK (accumulated >= 0),
  bet SMALLINT NOT NULL CHECK (bet IN (10, 25, 50, 100)),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE free_spin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own session" ON free_spin_sessions;
CREATE POLICY "own session" ON free_spin_sessions
  FOR ALL USING (user_id = auth.uid());

-- Atomic spin settlement: deduct bet, award win, return new balance
CREATE OR REPLACE FUNCTION settle_spin(p_bet INT, p_win INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_bal INT;
  v_net INT;
  v_new INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_bet NOT IN (10, 25, 50, 100) THEN RAISE EXCEPTION 'invalid bet'; END IF;
  IF p_win < 0 OR p_win > 5000000 THEN RAISE EXCEPTION 'invalid win'; END IF;

  SELECT COUNT(*) INTO v_bal FROM coins WHERE owner_id = v_uid;
  IF v_bal < p_bet THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  v_net := p_win - p_bet;

  IF v_net < 0 THEN
    DELETE FROM coins WHERE id IN (
      SELECT id FROM coins WHERE owner_id = v_uid ORDER BY acquired_at LIMIT (-v_net)
    );
  ELSIF v_net > 0 THEN
    INSERT INTO coins (owner_id) SELECT v_uid FROM generate_series(1, v_net);
  END IF;

  SELECT COUNT(*) INTO v_new FROM coins WHERE owner_id = v_uid;
  RETURN v_new;
END;
$$;

-- Buy free spins: deduct cost (bet*100), create session
CREATE OR REPLACE FUNCTION buy_free_spins(p_bet INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cost INT;
  v_bal INT;
  v_new INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_bet NOT IN (10, 25, 50, 100) THEN RAISE EXCEPTION 'invalid bet'; END IF;

  v_cost := p_bet * 100;

  SELECT COUNT(*) INTO v_bal FROM coins WHERE owner_id = v_uid;
  IF v_bal < v_cost THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  DELETE FROM coins WHERE id IN (
    SELECT id FROM coins WHERE owner_id = v_uid ORDER BY acquired_at LIMIT v_cost
  );

  INSERT INTO free_spin_sessions (user_id, remaining, accumulated, bet)
  VALUES (v_uid, 10, 0, p_bet)
  ON CONFLICT (user_id) DO UPDATE
    SET remaining = 10, accumulated = 0, bet = p_bet, created_at = now();

  SELECT COUNT(*) INTO v_new FROM coins WHERE owner_id = v_uid;
  RETURN v_new;
END;
$$;

-- Settle one free spin: update session, award if last
CREATE OR REPLACE FUNCTION settle_free_spin(p_win INT, p_is_last BOOLEAN)
RETURNS TABLE(remaining INT, accumulated INT, new_balance INT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session free_spin_sessions%ROWTYPE;
  v_new_rem INT;
  v_new_acc INT;
  v_balance INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_win < 0 OR p_win > 5000000 THEN RAISE EXCEPTION 'invalid win'; END IF;

  SELECT * INTO v_session FROM free_spin_sessions WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no active free spin session'; END IF;
  IF v_session.remaining <= 0 THEN RAISE EXCEPTION 'no remaining free spins'; END IF;

  v_new_rem := v_session.remaining - 1;
  v_new_acc := v_session.accumulated + p_win;

  IF p_is_last OR v_new_rem = 0 THEN
    IF v_new_acc > 0 THEN
      INSERT INTO coins (owner_id) SELECT v_uid FROM generate_series(1, v_new_acc);
    END IF;
    DELETE FROM free_spin_sessions WHERE user_id = v_uid;
    v_new_rem := 0;
  ELSE
    UPDATE free_spin_sessions SET remaining = v_new_rem, accumulated = v_new_acc WHERE user_id = v_uid;
  END IF;

  SELECT COUNT(*) INTO v_balance FROM coins WHERE owner_id = v_uid;
  RETURN QUERY SELECT v_new_rem, v_new_acc, v_balance;
END;
$$;
