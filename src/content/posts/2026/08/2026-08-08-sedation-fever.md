---
schemaVersion: 1
recordId: trauma-2026-08-08-sedation-fever
board: trauma
entryType: clinical-update
title: "진정제 조절과 발열, 눈꺼풀 움직임"
summary: "진정제 용량에 따른 혈압·각성 변화와 38.3℃ 발열, 눈꺼풀 떨림에 대한 설명을 기록했습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-08-08", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-08-08", precision: day, timezone: Asia/Seoul }
tags: [진정제, 혈압, 발열, 신경반응]
sources:
  - id: source-trauma-20260808-chat-summary
    type: chat-conversation
    certainty: reported
    label: "8월 8일 대화 검색 요약(원문 전문 미확보)"
  - id: source-trauma-20260808-neurology
    type: physician-report
    certainty: reported
    label: "보호자가 전한 신경과 설명"
exchanges:
  - id: exchange-trauma-20260808-001
    recordedAt: { start: "2026-08-08", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [원문 전문 확인 전 요약 복원]

        진정제를 늘리면 혈압이 떨어지고 깊이 자는 모습이 나타나며, 줄이면 몸부림이 늘고 눈을 뜬다. 적정 용량을 찾기 위해 계속 조절하고 있다. 밤사이 체온이 38.3℃까지 올라 해열제를 사용한 뒤 내려갔다.

        눈을 감을 때 힘을 주며 눈꺼풀이 떨리는 모습이 있었지만 이전의 좌상방 안구 편위는 보이지 않았다. 신경과에서는 경련이 아니라 의도적으로 힘을 주는 행동으로 판단했다고 전달받았다.
      fidelity: summary-reconstruction
    sourceRefs: [source-trauma-20260808-chat-summary, source-trauma-20260808-neurology]
amendments: []
media: []
related: [trauma-2026-08-04-pneumonia-neuro-evaluation]
privacyReviewed: true
---
