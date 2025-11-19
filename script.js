// ============================
// CONFIG
// ============================
const FEATURE_SERVICE_URL =
  "https://services.arcgis.com/mq0BGE5kHpm8mHFz/arcgis/rest/services/survey123_0b170f8709de43fd9014e2056704835d/FeatureServer/0";

// Correct field names (case sensitive!)
const FIELD_OID = "objectid";
const FIELD_WORKER = "field_worker";
const FIELD_PROJECT = "project_name";
const FIELD_START = "start_date";
const FIELD_END = "end_date";


// ============================
// COLOR MAP (consistent per worker)
// ============================
const workerColors = {};
function getWorkerColor(worker) {
  if (!workerColors[worker]) {
    const hue = (Object.keys(workerColors).length * 57) % 360;
    workerColors[worker] = `hsl(${hue}, 70%, 60%)`;
  }
  return workerColors[worker];
}


// ============================
// QUERY AGOL (fixed!)
// ============================
async function fetchAGOLEvents(startISO, endISO) {
  console.log("FullCalendar requested:", startISO, "→", endISO);

  // Convert safely
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();

  console.log("Computed ms:", startMs, endMs);

  if (isNaN(startMs) || isNaN(endMs)) {
    console.error("❌ INVALID DATE RANGE — cannot query AGOL");
    return [];
  }

  const where = `${FIELD_START} <= ${endMs} AND ${FIELD_END} >= ${startMs}`;
  console.log("WHERE clause:", where);

  const url =
    `${FEATURE_SERVICE_URL}/query?` +
    `where=${encodeURIComponent(where)}` +
    `&outFields=${FIELD_OID},${FIELD_WORKER},${FIELD_PROJECT},${FIELD_START},${FIELD_END}` +
    `&returnGeometry=false&f=json`;

  console.log("AGOL query URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("AGOL response:", data);

  if (!data.features) {
    console.error("No features returned from AGOL.");
    return [];
  }

  return data.features;
}


// ============================
// CONVERT AGOL FEATURES TO EVENTS
// ============================
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
      end: end,   // multi-day span
      allDay: true,
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


// ============================
// INIT CALENDAR
// ============================
document.addEventListener("DOMContentLoaded", async function () {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",

    events: async function (info, success, failure) {
      try {
        const features = await fetchAGOLEvents(info.startStr, info.endStr);
        const events = convertToEvents(features);
        success(events);
      } catch (err) {
        console.error(err);
        failure(err);
      }
    }
  });

  calendar.render();
});
