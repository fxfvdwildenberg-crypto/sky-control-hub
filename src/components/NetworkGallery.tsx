import runway from "@/assets/s8w2t93.png.asset.json";
import radar from "@/assets/1b6mj55.png.asset.json";
import airfield from "@/assets/39ps331.png.asset.json";
import turkey from "@/assets/5r7798j.png.asset.json";
import groundCrew from "@/assets/k4szs9r.png.asset.json";
import terminal from "@/assets/75vfzks.png.asset.json";
import towerDay from "@/assets/94pdb0q.png.asset.json";
import a320 from "@/assets/59mvrdt.png.asset.json";

const shots = [
  { url: runway.url, label: "Runway 27 approach lights", tag: "Night ops" },
  { url: towerDay.url, label: "Control tower", tag: "ATC" },
  { url: a320.url, label: "A320 lining up", tag: "Departure" },
  { url: turkey.url, label: "777 taxi out", tag: "Heavy" },
  { url: airfield.url, label: "Airfield overview", tag: "Movement area" },
  { url: terminal.url, label: "Apron & terminal", tag: "Ground" },
  { url: groundCrew.url, label: "Ground crew on stand", tag: "Ramp" },
  { url: radar.url, label: "Radar dome", tag: "Surveillance" },
];

export function NetworkGallery() {
  return (
    <section className="bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight md:text-2xl">From the network</h2>
            <p className="text-xs text-muted-foreground md:text-sm">Recent snapshots from across ATC365 airfields.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {shots.map((s) => (
            <figure
              key={s.url}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-border"
            >
              <img
                src={s.url}
                alt={s.label}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2 text-[10px] text-white md:text-xs">
                <span className="font-medium drop-shadow">{s.label}</span>
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 backdrop-blur-sm">{s.tag}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
