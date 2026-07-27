import type { FitResult } from "../types";

export function ScoreBadge({ fit }: { fit: FitResult }) {
  return (
    <span className={`score score-${fit.score}`} title={fit.reasons.join("\n")}>
      {fit.score}
      <span aria-hidden="true">/5</span>
      {fit.provisional && <i title="Provisional score">?</i>}
    </span>
  );
}
