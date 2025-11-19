// =======================================================
// CONFIG — YOUR AGOL FEATURE SERVICE
// =======================================================
const FEATURE_SERVICE_URL =
  "https://services.arcgis.com/mq0BGE5kHpm8mHFz/arcgis/rest/services/survey123_0b170f8709de43fd9014e2056704835d/FeatureServer/0";

// Correct field names (case-sensitive!)
const FIELD_OID = "objectid";
const FIELD_WORKER = "field_worker";
const FIELD_PROJECT = "project_name";
const FIELD_START = "start_date";
const FIELD_END = "end_date";


// =======================================================
// CONSISTENT COLORS PER WORKER
// =======================================================
const workerColors = {};
function getWorkerColor(worker) {
  if (!workerColors[worker]) {
    const hue = (Object.keys(workerColors).length * 61) % 360;
    workerColors[worker] = `hsl(${hue}, 70%, 60%)`;
  }
  return workerColors[worker];
}


// =======================================================
// QUERY AGOL — FIXED FOR SURVEY123 & UTC
// =======================================================
async function fetchAGOLEvents(info) {
  console.log("FullCalendar requested:", info.startStr, "→", info.endStr);

  // Convert FullCalendar range into UTC timestamps
  const startMs = Date.UTC(
    info.start.getFullYear(),
    info.start.getMonth(),
    info.start.getDate()
  );

  const endMs = Date.UTC(
    info.end.getFullYear(),
    info.end.getMonth(),
    info.end.getDate()
  );

  console.log("Computed UTC ms:", startMs, endMs);

  // Overlap check WHERE clause
  const where =
    `${FIELD_START} <= ${endMs} AND ${FIELD_END} >= ${startMs}`;

  console.log("WHERE clause:", where);

  // ★★ CRITICAL FIX FOR SURVEY123: outFields=* ★★
  const url =
    `${FEATURE_SERVICE_URL}/query?` +
    `where=${encodeURIComponent(where)}` +
    `&outFields=*` +
    `&returnGeometry=false&f=json`;

  console.log("AGOL query URL:", url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("AGOL response:", data);

    if (!data.features || !Array.isArray(data.features)) {
      console.error("No features returned from AGOL.");
      return [];
    }

    return data.features;
  } catch (err) {
    console.error("AGOL fetch error:", err);
    return [];
  }
}


// =======================================================
// CONVERT AGOL FEATURES → FULLCALENDAR EVENTS
// =======================================================
function convertToEvents(features) {
  const events = [];

  features.forEach(f => {
    const a = f.attributes;

    const worker = a[FIELD_WORKER] || "Unknown";
    const project = a[FIELD_PROJECT] || "(No Project)";

    const start = new Date(a[FIELD_START]).toISOString();
    const end = new Date(a[FIELD_END]).toISOString();

    const event = {
      id: a[FIELD_OID],
      title: `${project} (${worker})`,
      start: start,
      end: end,        // allow multi-day spanning
      allDay: true,    // FULL-DAY SPAN MODE
      backgroundColor: getWorkerColor(worker),
      borderColor: getWorkerColor(worker),
      textColor: "#000",
      extendedProps: { worker, project }
    };

    console.log("Event parsed:", event);
    events.push(event);
  });

  console.log("Final events array:", events);
  return events;
}


// =======================================================
// INITIALIZE FULLCALENDAR
// =======================================================
document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",

    // FULL DYNAMIC EVENT SOURCE
    events: async function(info, success, failure) {
      const features = await fetchAGOLEvents(info);
      const events = convertToEvents(features);
      success(events);
    }
  });

  calendar.render();
});
