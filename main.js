const API_KEY = "619ac11e02e7c09500b1dcb5da3e8a9a";
const grid = document.getElementById("grid");
const input = document.getElementById("searchInput");
const cities = new Map(); // cityKey -> cardEl

const WMO = {
  "01d": '<i class="fa-solid fa-sun" style="color:#f7c04f"></i>',
  "01n": '<i class="fa-solid fa-moon" style="color:#a0aec0"></i>',
  "02d": '<i class="fa-solid fa-cloud-sun" style="color:#f6ad55"></i>',
  "02n": '<i class="fa-solid fa-cloud-moon" style="color:#a0aec0"></i>',
  "03d": '<i class="fa-solid fa-cloud" style="color:#90a4ae"></i>',
  "03n": '<i class="fa-solid fa-cloud" style="color:#78909c"></i>',
  "04d": '<i class="fa-solid fa-cloud-meatball" style="color:#78909c"></i>',
  "04n": '<i class="fa-solid fa-cloud-meatball" style="color:#607d8b"></i>',
  "09d":
    '<i class="fa-solid fa-cloud-showers-heavy" style="color:#4f8ef7"></i>',
  "09n":
    '<i class="fa-solid fa-cloud-showers-heavy" style="color:#4f8ef7"></i>',
  "10d": '<i class="fa-solid fa-cloud-sun-rain" style="color:#4f8ef7"></i>',
  "10n": '<i class="fa-solid fa-cloud-moon-rain" style="color:#4f8ef7"></i>',
  "11d": '<i class="fa-solid fa-cloud-bolt" style="color:#f7c04f"></i>',
  "11n": '<i class="fa-solid fa-cloud-bolt" style="color:#f7c04f"></i>',
  "13d": '<i class="fa-solid fa-snowflake" style="color:#90caf9"></i>',
  "13n": '<i class="fa-solid fa-snowflake" style="color:#90caf9"></i>',
  "50d": '<i class="fa-solid fa-smog" style="color:#b0bec5"></i>',
  "50n": '<i class="fa-solid fa-smog" style="color:#b0bec5"></i>',
};

function icon(code) {
  return (
    WMO[code] ||
    '<i class="fa-solid fa-temperature-half" style="color:#4f8ef7"></i>'
  );
}

function dayName(dt, tz) {
  return new Date((dt + tz) * 1000).toLocaleDateString("en", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
}

function skeletonCard() {
  const d = document.createElement("div");
  d.className = "skeleton-card";
  d.innerHTML = `
    <div class="skel" style="height:18px;width:55%;margin-bottom:8px"></div>
    <div class="skel" style="height:13px;width:35%;margin-bottom:20px"></div>
    <div class="skel" style="height:56px;width:70%;margin-bottom:14px"></div>
    <div class="skel" style="height:13px;width:45%;margin-bottom:20px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      ${[1, 2, 3, 4].map(() => `<div class="skel" style="height:52px;border-radius:12px"></div>`).join("")}
    </div>
    <div style="display:flex;gap:8px">
      ${[1, 2, 3].map(() => `<div class="skel" style="flex:1;height:72px;border-radius:12px"></div>`).join("")}
    </div>`;
  return d;
}

async function fetchWeather(city, coords) {
  const base = "https://api.openweathermap.org/data/2.5";
  let curUrl, fcUrl;

  if (coords) {
    curUrl = `${base}/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
    fcUrl = `${base}/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
  } else {
    curUrl = `${base}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    fcUrl = `${base}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  }

  const [curRes, fcRes] = await Promise.all([fetch(curUrl), fetch(fcUrl)]);
  if (!curRes.ok) {
    const err = await curRes.json();
    throw new Error(err.message || "City not found");
  }
  return { cur: await curRes.json(), fc: await fcRes.json() };
}

function buildCard(cur, fc) {
  const key = `${cur.id}`;
  if (cities.has(key)) {
    showToast(`${cur.name} is already on your dashboard`);
    return;
  }

  // Process 3-day forecast (noon slot each day)
  const today = new Date().toISOString().split("T")[0];
  const days = {};
  fc.list.forEach((item) => {
    const d = new Date(item.dt * 1000).toISOString().split("T")[0];
    if (d === today) return;
    if (!days[d]) days[d] = [];
    days[d].push(item);
  });
  const forecast = Object.entries(days)
    .slice(0, 3)
    .map(([d, items]) => {
      const noon =
        items.find((i) => new Date(i.dt * 1000).getUTCHours() >= 11) ||
        items[0];
      const maxT = Math.round(Math.max(...items.map((i) => i.main.temp_max)));
      const minT = Math.round(Math.min(...items.map((i) => i.main.temp_min)));
      return {
        dt: noon.dt,
        tz: cur.timezone,
        icon: noon.weather[0].icon,
        maxT,
        minT,
      };
    });

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="city-name">${cur.name}</div>
        <div class="country">${cur.sys.country} · ${cur.coord.lat.toFixed(1)}°, ${cur.coord.lon.toFixed(1)}°</div>
      </div>
      <button class="remove-btn" title="Remove">✕</button>
    </div>
    <div class="main-weather">
      <div class="weather-icon">${icon(cur.weather[0].icon)}</div>
      <div>
        <div class="temp">${Math.round(cur.main.temp)}°C</div>
        <div class="feels">Feels like ${Math.round(cur.main.feels_like)}°C</div>
      </div>
    </div>
    <div class="desc">${cur.weather[0].description}</div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Humidity</div>
        <div class="meta-value">${cur.main.humidity}%</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Wind</div>
        <div class="meta-value">${(cur.wind.speed * 3.6).toFixed(1)} km/h</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Visibility</div>
        <div class="meta-value">${(cur.visibility / 1000).toFixed(1)} km</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Pressure</div>
        <div class="meta-value">${cur.main.pressure} hPa</div>
      </div>
    </div>
    <div class="forecast-title">3-Day Forecast</div>
    <div class="forecast-row">
      ${forecast
        .map(
          (f) => `
        <div class="fc-day">
          <div class="fc-day-name">${dayName(f.dt, cur.timezone)}</div>
          <div class="fc-icon">${icon(f.icon)}</div>
          <div class="fc-temp">${f.maxT}°</div>
          <div class="fc-min">${f.minT}°</div>
        </div>`,
        )
        .join("")}
    </div>
    <div class="updated">Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;

  card.querySelector(".remove-btn").onclick = () => {
    cities.delete(key);
    card.style.animation = "none";
    card.style.transition = "opacity 0.25s, transform 0.25s";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.remove();
      checkEmpty();
    }, 260);
  };

  if (!cities.size) grid.innerHTML = "";
  grid.appendChild(card);
  cities.set(key, card);
  checkEmpty();
}

function checkEmpty() {
  if (!cities.size) {
    grid.innerHTML = `<div class="empty-state">
      <div class="icon"><i class="fa-solid fa-earth-americas"></i></div>
      <p>Search for a city or use quick picks above to get started</p>
    </div>`;
  }
}

async function addCity(city, coords) {
  const skel = skeletonCard();
  if (!cities.size) grid.innerHTML = "";
  grid.appendChild(skel);

  try {
    const { cur, fc } = await fetchWeather(city, coords);
    skel.remove();
    buildCard(cur, fc);
  } catch (e) {
    skel.remove();
    checkEmpty();
    showToast(`<i class="fa-solid fa-triangle-exclamation"></i>${e.message}`);
  }
}

async function handleSearch() {
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  await addCity(q);
}

document.getElementById("searchBtn").onclick = handleSearch;
input.addEventListener("keydown", (e) => e.key === "Enter" && handleSearch());

document
  .querySelectorAll(".chip")
  .forEach((c) => c.addEventListener("click", () => addCity(c.dataset.city)));

document.getElementById("locBtn").onclick = () => {
  if (!navigator.geolocation) return showToast("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      addCity(null, { lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => showToast("Location access denied"),
  );
};

// Auto-load on start
(async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        addCity(null, { lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => addCity("Cairo"),
    );
  } else {
    await addCity("Cairo");
  }
})();
