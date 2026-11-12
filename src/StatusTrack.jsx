import { STATUSES } from "./statuses";

const FLOW = STATUSES.filter((status) => status.id !== "needs_info");

export default function StatusTrack({ status }) {
  const needsInfo = status === "needs_info";
  const done = status === "done";
  const activeIndex = needsInfo ? 1 : FLOW.findIndex((step) => step.id === status);

  return (
    <div className={needsInfo ? "track track-paused" : "track"}>
      {FLOW.map((step, index) => {
        let state = "upcoming";
        if (needsInfo && index === activeIndex) state = "paused";
        else if (done || index < activeIndex) state = "complete";
        else if (index === activeIndex) state = "current";
        return (
          <div key={step.id} className={`track-step ${state}`}>
            <span className="track-dot" aria-hidden="true" />
            <span className="track-label">{step.label}</span>
          </div>
        );
      })}
      {needsInfo && <p className="needs-info">Paused — this one needs information from you</p>}
    </div>
  );
}
