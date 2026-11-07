    //init var
    export const STORAGE_KEY = 'afforest_trees_db_v2';

    export let treeDB = [];
    export let isMobileDevice = false;
    export let devTapCount = 0;
    export let devTapTimer = null;

    export const CERTAINTY_MAP = {
      1: "Unknown",
      2: "Extremely Doubtful",
      3: "Doubtful",
      4: "Somewhat Uncertain",
      5: "Uncertain",
      6: "Moderately Certain",
      7: "Fairly Certain",
      8: "Almost Certain",
      9: "Very Certain",
      10: "Certain"
    };

//database
  const SUPABASE_URL = 'https://ztzooirkdgvlpxnkzlgu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0em9vaXJrZGd2bHB4bmt6bGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzAzODEsImV4cCI6MjEwOTIwNjM4MX0.VFkr319f9ZFPD3zUXhohdRdIErjjOcr-l7rk33VRPb8';
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  export async function loadDatabase() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/trees?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      treeDB = data || [];
      updateTreeCounters();
      renderBlogFeed();
      refreshMapHeatmaps();
    } catch (err) {
      console.error('Failed to load trees from cloud:', err);
      showToast("Cloud database offline.", true);
    }
  }

  export async function saveTreeToCloud(newTree) {
    try {
      const { error } = await supabaseClient
        .from('trees')
        .insert([newTree]);

      if (error) throw error;

      showToast("Tree observation synced to cloud successfully!");
    } catch (err) {
      console.error('Cloud save failed:', err);
      showToast("failed to sync to cloud.", true);
    }
  }

    export function updateTreeCounters() {
      const total = treeDB.length;
      document.getElementById('headerTreeCount').innerText = total;
      document.getElementById('homeTotalTrees').innerText = total.toLocaleString();
    }