import React from 'react';

const LEVELS = [
  { key: '风险', min: 0, next: 90, className: 'risk' },
  { key: '普通', min: 90, next: 120, className: 'normal' },
  { key: '银牌', min: 120, next: 150, className: 'silver' },
  { key: '金牌', min: 150, next: 180, className: 'gold' },
  { key: '钻石', min: 180, next: null, className: 'diamond' }
];

const normalizeLevelName = (level) => {
  const text = String(level || '').replace('会员', '').trim();
  return LEVELS.some(item => item.key === text) ? text : '';
};

const getLevelByScore = (score) => {
  if (score >= 180) return LEVELS[4];
  if (score >= 150) return LEVELS[3];
  if (score >= 120) return LEVELS[2];
  if (score >= 90) return LEVELS[1];
  return LEVELS[0];
};

const getLevelMeta = (level, score) => {
  const normalizedScore = Number.isFinite(Number(score)) ? Number(score) : 100;
  const levelName = normalizeLevelName(level);
  return LEVELS.find(item => item.key === levelName) || getLevelByScore(normalizedScore);
};

const getProgress = (meta, score) => {
  const normalizedScore = Math.max(Number(score) || 0, 0);

  if (!meta.next) {
    return 100;
  }

  const range = meta.next - meta.min;
  return Math.max(6, Math.min(100, ((normalizedScore - meta.min) / range) * 100));
};

const getNextText = (meta, score) => {
  const normalizedScore = Math.max(Number(score) || 0, 0);

  if (!meta.next) {
    return '已达最高等级';
  }

  return `距下一等级还差 ${Math.max(meta.next - normalizedScore, 0)} 分`;
};

const CreditBadge = ({
  level,
  score,
  compact = false,
  showScore = true,
  className = ''
}) => {
  const normalizedScore = Number.isFinite(Number(score)) ? Number(score) : 100;
  const meta = getLevelMeta(level, normalizedScore);
  const progress = getProgress(meta, normalizedScore);

  return (
    <div className={`credit-badge credit-badge-${meta.className}${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="credit-badge-main">
        <span className="credit-badge-medal" aria-hidden="true" />
        <div className="credit-badge-copy">
          <div className="credit-badge-title-row">
            <span className="credit-badge-label">{meta.key}信用</span>
            <span className="credit-info-trigger" tabIndex="0" aria-label="查看信用规则">
              i
              <span className="credit-tooltip" role="tooltip">
                <strong>信用等级规则</strong>
                <span>初始信用分 100；0-89 风险，90-119 普通，120-149 银牌，150-179 金牌，180 分及以上钻石。</span>
                <span>评价：5星 +5，4星 +3，3星 0，2星 -3，1星 -5。</span>
                <span>发货：付款后 48 小时内上传有效物流 +2；48-72 小时发货 -3；超过 72 小时发货 -5。</span>
                <span>未发货取消：待发货超过 72 小时后买家取消，卖家额外 -8。</span>
                <span>低星比例：近 30 天有效评价满 5 条后统计 1-2 星占比；达到 25% 额外 -6，达到 40% 额外 -12，比例回落会返还对应扣分。</span>
                <span>纠纷：卖家主动解决售后 +2；平台判定卖家责任 -10；虚假发货或欺诈 -20，并进入风险提醒。</span>
              </span>
            </span>
          </div>
          {showScore && (
            <div className="credit-badge-score">
              <strong>{Math.round(normalizedScore)}</strong>
              <span>信用分</span>
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="credit-progress-wrap" aria-label={getNextText(meta, normalizedScore)}>
          <div className="credit-progress-track">
            <span className="credit-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="credit-progress-text">{getNextText(meta, normalizedScore)}</div>
        </div>
      )}
    </div>
  );
};

export default CreditBadge;
