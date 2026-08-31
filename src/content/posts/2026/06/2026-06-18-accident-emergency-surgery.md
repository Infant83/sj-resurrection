---
schemaVersion: 1
recordId: trauma-2026-06-18-initial-emergency
board: trauma
entryType: clinical-update
title: "사고 직후와 응급수술"
summary: "사고 직후의 쇼크, 응급수술과 초기 손상을 과거 대화 요약에서 복원한 기록입니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-06-18", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-07-26", precision: day, timezone: Asia/Seoul }
tags: [사고초기, 응급수술, 출혈성쇼크]
sources:
  - id: source-trauma-20260618-chat-summary
    type: chat-conversation
    certainty: uncertain
    label: "‘중증 외상 예후 분석’ 대화 검색 요약(원문 전문 미확보)"
  - id: source-trauma-20260618-recollection
    type: user-recollection
    certainty: reported
    label: "보호자가 대화에서 회고한 사고 직후 상황"
  - id: source-trauma-20260828-accident-date
    type: user-recollection
    certainty: reported
    label: "8월 28일 상태 업데이트에 기록된 사고일(6월 18일)"
  - id: source-trauma-20260618-gpt-summary
    type: gpt-analysis
    certainty: inferred
    label: "당시 GPT 답변 검색 요약"
exchanges:
  - id: exchange-trauma-20260618-001
    recordedAt: { start: "2026-07-26", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [원문 전문 확인 전 요약 복원]

        2026년 6월 18일, 선진은 높은 곳에서 추락한 뒤 반응이 없고 코와 귀에서 출혈이 있었으며 호흡이 어려운 상태로 병원에 이송되었다. 응급실에서는 혈압이 거의 잡히지 않고 의식이 없는 상태였으며, CT 촬영 뒤 곧바로 응급수술에 들어갔다.

        간 파열 부위를 봉합하고 비장을 절제했다. 양측 골반과 손목, 두개골 골절이 있었고 골반 쪽 대량출혈은 패킹으로 조절했다. 초기에는 쇼크를 관리하기 위해 강심제 또는 승압제를 사용했고, 저산소로 인한 뇌손상 가능성도 우려했다.
      fidelity: summary-reconstruction
    assistant:
      text: |-
        [당시 답변 원문 확인 전 요약]

        당시 GPT는 상태를 다발성 중증외상과 출혈성 쇼크로 정리했다. 우선순위는 출혈 조절, 혈압과 장기 관류 회복, 호흡 안정, 뇌손상 여부의 반복 평가라고 설명했다. 초기 수술은 생명을 위협하는 문제를 먼저 통제하는 단계이며, 이후 경과와 검사를 함께 보아야 하므로 이 시점에서 신경학적 예후를 확정할 수 없다고 답했다.
      modelLabel: ChatGPT
      fidelity: summary-reconstruction
    sourceRefs:
      - source-trauma-20260618-chat-summary
      - source-trauma-20260618-recollection
      - source-trauma-20260618-gpt-summary
amendments:
  - id: amendment-trauma-20260618-001
    recordedAt: { start: "2026-07-27", precision: day, timezone: Asia/Seoul }
    kind: correction
    target: exchange-trauma-20260618-001
    note: "초기 대화에서 잘못 전달된 ‘직장절제’라는 표현은 이후 ‘비장절제’로 정정되었습니다. 사고일은 8월 28일에 남긴 경과 기록에서 6월 18일로 확인되었으나, 원문 전문 확인이 남아 있습니다."
    sourceRefs: [source-trauma-20260618-chat-summary, source-trauma-20260828-accident-date]
media: []
related: []
privacyReviewed: true
---
