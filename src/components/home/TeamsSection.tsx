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
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-20 2xl:px-32 py-16 lg:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium leading-[22px] text-[#0038E1]">
              {teams.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight lg:leading-[60px] text-[#1C1B1F]">
              {teams.heading}
            </h2>
          </div>

          <p className="text-base sm:text-[18px] leading-[28px] text-[#1C1B1F] sm:shrink-0 sm:text-right">
            {teams.subtitle}
          </p>
        </div>

        <ul className="mt-10 divide-y divide-[#4A4A52]/30 border-t border-b border-[#4A4A52]/30">
          {teams.items.map((team, idx) => {
            const art =
              TEAM_ILLUSTRATIONS[team.index] ??
              TEAM_FALLBACKS[idx % TEAM_FALLBACKS.length];

            return (
              <li
                key={`${team.index}-${team.name}`}
                className="py-7 lg:py-8 grid grid-cols-1 md:grid-cols-[44px_180px_1fr] xl:grid-cols-[36px_156px_210px_minmax(300px,1fr)_auto] 2xl:grid-cols-[44px_200px_280px_1fr_auto] items-start md:items-center gap-5 lg:gap-8 xl:gap-6 2xl:gap-8"
              >
                <span className="font-mono text-[16px] font-medium leading-[24px] text-[#1C1B1F]">
                  {team.index}
                </span>

                <div className="flex items-center justify-start md:justify-center">
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
                    className="h-auto max-h-[126px] w-auto max-w-[176px] object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="text-2xl lg:text-[28px] font-normal leading-snug lg:leading-[38px] text-[#1C1B1F]">
                    {team.name}
                  </h3>
                  <div
                    aria-hidden="true"
                    className="mt-3 w-[64px] h-[5px] border-[1.5px] border-[#757E91]"
                    style={{ backgroundColor: team.accentColor }}
                  />
                </div>

                <p className="md:col-start-3 xl:col-start-auto text-base sm:text-[18px] leading-[28px] sm:leading-[29px] text-[#4A5565] min-w-0">
                  {team.description}
                </p>

                <div className="md:col-start-3 xl:col-start-auto flex xl:justify-end">
                  <span className="inline-flex items-center bg-[#1C1B1F] text-white font-mono text-xs sm:text-sm px-3 py-1.5 rounded-md leading-snug whitespace-normal sm:whitespace-nowrap xl:whitespace-normal xl:max-w-[240px] 2xl:max-w-none 2xl:whitespace-nowrap">
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
