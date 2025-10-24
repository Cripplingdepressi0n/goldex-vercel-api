export default async function handler(req, res) {
  try {
    const [spotRes, fxRes] = await Promise.all([
      fetch("https://api.metals.live/v1/spot"),
      fetch("https://api.exchangerate.host/latest?base=AUD&symbols=USD,EUR")
    ]);

    if (!spotRes.ok) throw new Error("metals.live " + spotRes.status);
    if (!fxRes.ok) throw new Error("fx " + fxRes.status);

    const metals = await spotRes.json();
    const fx = await fxRes.json();

    const OZ = 31.1034768;
    const goldUsdOz = Number((metals.find(r => r[0] === "Gold") || [])[1]);
    const silverUsdOz = Number((metals.find(r => r[0] === "Silver") || [])[1]);
    const audToUsd = Number(fx?.rates?.USD || 0.65);
    const usdToAud = 1 / audToUsd;

    const gold_per_g_aud = (goldUsdOz * usdToAud) / OZ;
    const silver_per_g_aud = (silverUsdOz * usdToAud) / OZ;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      gold_per_g_aud,
      silver_per_g_aud,
      updated_at: new Date().toISOString(),
      source: "metals.live + exchangerate.host"
    });
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(502).json({ error: String(err) });
  }
}

