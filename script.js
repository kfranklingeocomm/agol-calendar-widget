events: async function(info, success, failure) {
  console.log("FullCalendar requested:", info.startStr, "→", info.endStr);

  // Convert calendar range to UTC ms (AGOL requires UTC)
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

  const where = `${FIELD_START} <= ${endMs} AND ${FIELD_END} >= ${startMs}`;
  console.log("WHERE:", where);

  // ★★ FIXED: outFields=* instead of specific fields ★★
  const url =
    `${FEATURE_SERVICE_URL}/query?` +
    `where=${encodeURIComponent(where)}` +
    `&outFields=*` +
    `&returnGeometry=false&f=json`;

  console.log("AGOL query URL:", url);

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    console.log("AGOL response:", data);

    if (!data.features) {
      console.error("AGOL returned no features.");
      success([]);
      return;
    }

    const events = convertToEvents(data.features);
    console.log("Final events:", events);
    success(events);

  } catch (err) {
    console.error("AGOL ERROR:", err);
    failure(err);
  }
}
