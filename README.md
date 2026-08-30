# SJ Resurrection

**선진 부활 프로젝트**는 가족이 남긴 날짜별 기록, 편지, 의학적 질문과 재활 준비를 당시의 사용자 원문 및 ChatGPT 답변과 함께 보존하는 비공개 아카이브입니다.

프로젝트 표식은 아스클레피오스의 지팡이(⚕)입니다. 의료기관의 표장이 아니라 선진의 회복을 기다리며
곁을 지키고, 돌봄과 희망의 시간을 기록한다는 의미로 사용합니다. 이 표식과 연결된 보호자의 꿈은
원문이 확인된 뒤 별도 기록으로 보존합니다.

## Current privacy state

- Intended repository visibility: **Private**
- GitHub Pages: **Disabled**
- Deployment workflow: **Not included**
- Search analytics, trackers, remote fonts, external embeds: **Not included**

`robots.txt`와 `noindex` 메타 태그는 방어적 보조 장치일 뿐 접근 통제가 아닙니다. 실제 기록을 공개 웹에 배포하려면 별도의 명시적 결정과 비식별 검토가 필요합니다.

## Experience

- Facebook-style continuous feed without numbered pages
- Stable detail URL for every post
- Original user prompt as the main post
- GPT response immediately below as an expandable reply
- Board, date, search, newest/oldest controls
- Separate event time and conversation-recorded time
- Explicit provenance for medical records, clinician reports, caregiver observations, and GPT interpretation
- Corrections are appended; original text is not silently overwritten

## Boards

1. `trauma` — 중증외상 예후와 상태
2. `life` — 선진과 함께하는 삶
3. `medical` — 의학 지식
4. `rehabilitation` — 재활 준비
5. `media` — 자료·미디어 보관함

## Local development

```bash
npm install
npm run check
npm run build
npm run dev
```

The configured base path is `/sj-resurrection/` for a possible future GitHub Pages deployment. Public deployment is deliberately not automated.

## Add a draft post

```bash
npm run new:post -- --board=trauma --date=2026-08-30 --slug=status-update --title="상태 업데이트"
```

Every imported entry must be reviewed under [EDITORIAL_POLICY.md](EDITORIAL_POLICY.md) before changing `status` to `published`.
