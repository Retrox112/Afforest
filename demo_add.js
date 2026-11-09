(async function() {
  const demoSpecies = ['Oak', 'Pine', 'Birch', 'Maple', 'Banyan', 'Redwood', 'Eucalyptus', 'Cedar'];
  const count = 0; // add the number of demo trees you want to generate here
  
  console.log("Generating ${count} demo trees...");
  for (let i = 0; i < count; i++) {
    const lat = 20 + (Math.random() - 0.5) * 40;
    const lng = (Math.random() - 0.5) * 120;
    const species = demoSpecies[Math.floor(Math.random() * demoSpecies.length)];
    const age = Math.floor(Math.random() * 120) + 1;
    const certainty = Math.floor(Math.random() * 9) + 2;

    const demoTree = {
      id: 'demo_' + Date.now(),
      lat: lat,
      lng: lng,
      type: species,
      age: age,
      certainty: certainty,
      logs: [{
        photo: `https://placehold.co/600x400/0a1128/52b788?text=${encodeURIComponent(species)}+Tree`,
        timestamp: new Date().toISOString(),
        certainty: certainty
      }]
    };
    treeDB.unshift(demoTree);
    await saveTreeToCloud(demoTree);
  }
  
  refreshMapHeatmaps();
  renderBlogFeed();
  if (typeof analyticsMap !== 'undefined' && analyticsMap) runAnalyticsQuery();
  updateTreeCounters();
  console.log("Successfully added and synced 12 demo trees!");
})();