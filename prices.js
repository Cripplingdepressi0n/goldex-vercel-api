export default async function handler(req, res) {
  try {
    // fetch both in parallel
    const [spotRes, fxRes] = await Promise.all([
      fetch("https://api.metals.live/v1/spot"),
      fetch("https://api.exchangerate.host/latest?base=AUD&symbols=USD,EUR")
    ]);

    if (!spotRes.ok) throw new Error("metals.live " + spotRes.status);
    if (!fxRes.ok) throw new Error("fx " + fxRes.status);

    const metals = await spotRes.json();
    const fx = await fxRes.json();

    // constants / math
    const OZ = 31.1034768;

    // metals.live returns like:
    // [ ["Gold", 2375.22], ["Silver", 27.98], ... ]
    const goldUsdOz   = Number((metals.find(r => r[0] === "Gold")   || [])[1]);
    const silverUsdOz = Number((metals.find(r => r[0] === "Silver") || [])[1]);

    // fx.rates.USD is AUD→USD. We want USD→AUD so invert it.
    const audToUsd = Number(fx?.rates?.USD || 0.65);
    const usdToAud = 1 / audToUsd;

    if (!isFinite(goldUsdOz) || !isFinite(silverUsdOz)) {
        throw new Error("Bad metals.live payload");
    }

    // convert USD/oz -> AUD/g
    const gold_per_g_aud   = (goldUsdOz   * usdToAud) / OZ;
    const silver_per_g_aud = (silverUsdOz * usdToAud) / OZ;

    // allow Shopify to read it (CORS)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      gold_per_g_aud,
      silver_per_g_aud,
      updated_at: new Date().toISOString(),
      source: "metals.live + exchangerate.host"
    });
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(502).json({
      error: String(err)
    });
  }
}
