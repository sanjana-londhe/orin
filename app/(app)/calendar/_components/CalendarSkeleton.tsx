import React from "react";

const pulse: React.CSSProperties = {
  background: "linear-gradient(90deg, #f1f3ef 25%, #e9ede9 50%, #f1f3ef 75%)",
  backgroundSize: "200% 100%",
  animation: "pulse 1.4s ease infinite",
  borderRadius: 4,
};

export function CalendarSkeleton() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        <div style={{ ...pulse, height: 10, width: 70, marginBottom: 10 }} />
        <div style={{ ...pulse, height: 28, width: 200 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ padding: "8px 0", display: "flex", justifyContent: "center" }}>
            <div style={{ ...pulse, height: 10, width: 24 }} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ height: 130, borderRight: (i + 1) % 7 !== 0 ? "1px solid #dde4de" : "none", borderBottom: "1px solid #dde4de", padding: "8px 6px" }}>
            <div style={{ ...pulse, width: 22, height: 22, borderRadius: "50%", margin: "0 auto 6px" }} />
            {i % 3 === 0 && <div style={{ ...pulse, height: 15, marginBottom: 3 }} />}
            {i % 5 === 0 && <div style={{ ...pulse, height: 15, width: "70%" }} />}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0 0} }`}</style>
    </div>
  );
}

export function MobileCalendarSkeleton() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #dde4de", display: "flex", justifyContent: "center" }}>
        <div style={{ ...pulse, height: 22, width: 160 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f1f3ef", minHeight: 56 }}>
            <div style={{ width: 56, borderRight: "2px solid #e9ede9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 4, padding: "12px 0 8px" }}>
              <div style={{ ...pulse, height: 10, width: 20 }} />
              <div style={{ ...pulse, height: 24, width: 24, borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              {i % 2 === 0 && <div style={{ ...pulse, height: 20, width: "65%" }} />}
              {i % 3 === 1 && <div style={{ ...pulse, height: 20, width: "45%" }} />}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0 0} }`}</style>
    </div>
  );
}
