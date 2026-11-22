"use client";

import { useAppData } from "@/context/AppDataContext";

interface TeamIllustrationSpec {
  src: string;
  width: number;
  height: number;
}

const TEAM_ILLUSTRATIONS: Record<string, TeamIllustrationSpec> = {
  "01": { src: "/images/figma/team-fw.svg", width: 194, height: 162 },
  "02": { src: "/images/figma/team-fa.svg", width: 223, height: 189 },
  "03": { src: "/images/figma/team-bn.svg", width: 213, height: 117 },
  "04": { src: "/images/figma/team-da.svg", width: 151, height: 161 },
  "05": { src: "/images/figma/team-qa.svg", width: 201, height: 200 },
};

const TEAM_FALLBACKS: TeamIllustrationSpec[] = [
  TEAM_ILLUSTRATIONS["01"],
  TEAM_ILLUSTRATIONS["02"],
  TEAM_ILLUSTRATIONS["03"],
  TEAM_ILLUSTRATIONS["04"],
  TEAM_ILLUSTRATIONS["05"],
];

export function TeamsSection() {
  const { home } = useAppData();
  const { teams } = home;

  return (
    <section id="teams" className="scroll-mt-28 w-full bg-[#F5F5FA]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-[20px] text-[#0038E1]">
              {teams.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[38px] font-normal leading-tight lg:leading-[48px] text-[#1C1B1F]">
              {teams.heading}
            </h2>
          </div>

          <p className="max-w-sm text-sm sm:text-[15px] leading-[24px] text-[#4A5565] sm:text-right break-words">
            {teams.subtitle}
          </p>
        </div>

        <ul className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:block md:divide-y md:divide-[#4A4A52]/30 md:border-t md:border-b md:border-[#4A4A52]/30">
          {teams.items.map((team, idx) => {
            const art =
              TEAM_ILLUSTRATIONS[team.index] ??
              TEAM_FALLBACKS[idx % TEAM_FALLBACKS.length];

            return (
              <li
                key={`${team.index}-${team.name}`}
                className="grid grid-cols-[minmax(0,1fr)_72px] md:grid-cols-[36px_140px_1fr] xl:grid-cols-[36px_140px_210px_minmax(280px,1fr)_auto] items-start md:items-center gap-x-4 gap-y-3 lg:gap-6 rounded-xl border border-[#D6D9E3] bg-white p-4 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-5 lg:py-6"
              >
                <span className="col-start-1 row-start-1 md:col-auto md:row-auto text-[13px] md:text-[14px] font-medium leading-[20px] text-[#0038E1] md:text-[#1C1B1F]">
                  {team.index}
                </span>

                <div className="col-start-2 row-start-1 row-span-2 md:col-auto md:row-auto md:row-span-1 flex items-center justify-center self-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={art.src}
                    alt=""
                    aria-hidden="true"
                    width={art.width}
                    height={art.height}
                    loading="lazy"
                    decoding="async"
                    style={{ aspectRatio: `${art.width} / ${art.height}` }}
                    className="h-auto max-h-[72px] w-auto max-w-[72px] md:max-h-[96px] md:max-w-[140px] object-contain"
                  />
                </div>

                <div className="col-start-1 row-start-2 md:col-auto md:row-auto min-w-0">
                  <h3 className="text-[19px] md:text-xl lg:text-[22px] font-normal leading-snug lg:leading-[30px] text-[#1C1B1F] break-words">
                    {team.name}
                  </h3>
                  <div
                    aria-hidden="true"
                    className="mt-2.5 w-[52px] h-[4px] border border-[#757E91]"
                    style={{ backgroundColor: team.accentColor }}
                  />
                </div>

                <p className="col-span-2 md:col-span-1 md:col-start-3 xl:col-start-auto text-sm sm:text-[15px] leading-[24px] text-[#4A5565] min-w-0 break-words">
                  {team.description}
                </p>

                <div className="col-span-2 md:col-span-1 md:col-start-3 xl:col-start-auto flex min-w-0 xl:justify-end">
                  <span className="inline-flex max-w-full items-center bg-[#1C1B1F] text-white text-xs sm:text-[13px] px-3 py-1.5 rounded-md leading-snug whitespace-normal break-words xl:max-w-[240px] 2xl:max-w-none">
                    {team.toolsLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
