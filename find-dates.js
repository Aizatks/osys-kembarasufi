const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GIDS = ['377196173', '260412826', '1940566849', '337539407', '44458730'];

async function checkGid(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (match) {
    const json = JSON.parse(match[1]);
    const firstRow = json.table.rows[0]?.c.map(c => c?.v || '-').join(' | ');
    console.log(`GID ${gid}: ${firstRow?.substring(0, 100)}`);
    if (text.includes('WEST EUROPE')) console.log(`  -> Contains "WEST EUROPE"`);
  }
}

async function run() {
  for (const gid of GIDS) {
    await checkGid(gid);
  }
}
run();
