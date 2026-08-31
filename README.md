# SJ Resurrection

**선진 부활 프로젝트**는 가족이 남긴 날짜별 기록, 편지, 의학적 질문과 재활 준비를 당시의 사용자 원문 및 ChatGPT 답변과 함께 보존하기 위해 만드는 아카이브입니다.

프로젝트 표식은 아스클레피오스의 지팡이(⚕)입니다. 의료기관의 표장이 아니라 선진의 회복을 기다리며
곁을 지키고, 돌봄과 희망의 시간을 기록한다는 의미로 사용합니다. 이 표식과 연결된 보호자의 꿈은
원문이 확인된 뒤 별도 기록으로 보존합니다.

## Current privacy state

- Repository visibility: **Public**
- GitHub Pages: **Public preview active**
- Published content: **source-verified complete user prompts and complete GPT replies only**
- Deployment workflow: **Included**
- Search analytics, trackers, remote fonts, external embeds: **Not included**

`robots.txt`와 `noindex` 메타 태그는 방어적 보조 장치일 뿐 접근 통제가 아닙니다. 요약·재구성본은 게시하지 않으며, 원 대화에서 사용자 프롬프트와 GPT 답변 전문이 함께 확인된 기록만 공개합니다.

## Hosting roadmap

- **Current:** GitHub Pages에서 원문 전용 기록 구조와 사용성을 확인하는 공개 미리보기
- **Before original-media imports:** Pages 공개 배포 중단 및 미디어 게시 대상 재검토
- **Future:** Cloudflare 기반 동적 사이트로 전환하고 로그인 사용자에게만 전체 기록 접근 허용

## Experience

- Facebook-style continuous feed without numbered pages
- Stable detail URL for every post
- Original user prompt as the main post
- GPT response immediately below as an expandable reply
- Board, conversation date, search, newest/oldest controls
- Feed grouping by original conversation time; optional event time stays separate
- Explicit provenance for medical records, clinician reports, caregiver observations, and GPT interpretation
- Corrections are appended; original text is not silently overwritten

## Boards

1. `trauma` — 경과기록
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

The configured base path is `/sj-resurrection/` for the GitHub Pages public preview.

## Add a draft post

```bash
npm run new:post -- --board=trauma --date=2026-08-30 --slug=status-update --title="상태 업데이트"
```

The generated draft intentionally contains an unverified placeholder and fails the privacy gate until the complete source pair, source IDs, hashes, and verification time are filled in. Every imported entry must be reviewed under [EDITORIAL_POLICY.md](EDITORIAL_POLICY.md) before changing `status` to `published`.
