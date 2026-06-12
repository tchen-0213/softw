const CREDIT_LEVELS = [
  { level: '风险', min: 0 },
  { level: '普通', min: 90 },
  { level: '银牌', min: 120 },
  { level: '金牌', min: 150 },
  { level: '钻石', min: 180 }
];

const SELLER_CANCEL_NON_SHIPMENT_DELTA = -8;

const clampCreditScore = (score) => Math.max(0, Math.round(Number(score) || 0));

const getCreditLevel = (score) => {
  const normalizedScore = clampCreditScore(score);
  return [...CREDIT_LEVELS]
    .reverse()
    .find(item => normalizedScore >= item.min)?.level || '风险';
};

const getCreditDeltaByRating = (rating) => {
  const value = Number(rating);
  if (value >= 5) return 5;
  if (value === 4) return 3;
  if (value === 3) return 0;
  if (value === 2) return -3;
  return -5;
};

const getLowRatingPenalty = (ratings) => {
  const validRatings = (ratings || [])
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));

  if (validRatings.length < 5) {
    return 0;
  }

  const lowRatingCount = validRatings.filter(value => value <= 2).length;
  const lowRatingRatio = lowRatingCount / validRatings.length;

  if (lowRatingRatio >= 0.4) {
    return -12;
  }

  if (lowRatingRatio >= 0.25) {
    return -6;
  }

  return 0;
};

const getHoursBetween = (start, end = new Date()) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.max((endTime - startTime) / (1000 * 60 * 60), 0);
};

const getShippingCreditDelta = (paidAt, shippedAt = new Date()) => {
  const hours = getHoursBetween(paidAt, shippedAt);

  if (hours <= 48) {
    return 2;
  }

  if (hours <= 72) {
    return -3;
  }

  return -5;
};

const isOverdueShipmentCancellation = (paidAt, cancelledAt = new Date()) => (
  getHoursBetween(paidAt, cancelledAt) > 72
);

const applyCreditDelta = async (user, delta, options = {}) => {
  const normalizedDelta = Number(delta);

  if (!user || !Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    return null;
  }

  const nextScore = clampCreditScore(Number(user.creditScore || 0) + normalizedDelta);
  const nextLevel = getCreditLevel(nextScore);

  await user.update({
    creditScore: nextScore,
    creditLevel: nextLevel
  }, options);

  return {
    delta: normalizedDelta,
    creditScore: nextScore,
    creditLevel: nextLevel
  };
};

module.exports = {
  SELLER_CANCEL_NON_SHIPMENT_DELTA,
  applyCreditDelta,
  getCreditDeltaByRating,
  getCreditLevel,
  getLowRatingPenalty,
  getShippingCreditDelta,
  isOverdueShipmentCancellation
};
