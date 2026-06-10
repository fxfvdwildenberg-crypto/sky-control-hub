import type { ReactNode } from "react";

export function PageBanner({
  image,
  title,
  subtitle,
  icon,
}: {
  image: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative mb-6 h-32 w-full overflow-hidden rounded-2xl md:h-40">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      <div className="relative z-10 flex h-full items-end px-5 pb-4 md:px-7">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 text-primary backdrop-blur">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
