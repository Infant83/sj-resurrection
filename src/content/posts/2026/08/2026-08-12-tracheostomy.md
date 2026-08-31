---
schemaVersion: 1
recordId: trauma-2026-08-12-tracheostomy
board: trauma
entryType: clinical-update
title: "기관절개술 예정과 시술 직후 확인사항"
summary: "기관절개술 사전 동의와 기관지내시경 질문, 시술 직후 확인할 위험을 함께 남겼습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-08-12", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-08-11", precision: day, timezone: Asia/Seoul }
tags: [기관절개술, 기관지내시경, 호흡, 동의]
sources:
  - id: source-trauma-20260812-visible-prompts
    type: chat-conversation
    certainty: uncertain
    label: "현재 확인 가능한 기관절개·기관지내시경 질문(작성일은 ‘내일’ 문맥으로 복원)"
  - id: source-trauma-20260812-nurse
    type: nurse-report
    certainty: reported
    label: "보호자가 전달받아 기록한 시술 예정 설명"
  - id: source-trauma-20260812-gpt-summary
    type: gpt-analysis
    certainty: inferred
    label: "당시 GPT 답변 검색 요약"
  - id: source-trauma-20260815-followup
    type: nurse-report
    certainty: reported
    label: "8월 15일 기관절개관 산소 공급 상태"
exchanges:
  - id: exchange-trauma-20260812-001
    recordedAt: { start: "2026-08-11", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        선진이는 내일 기관절개하면서 기관내시경도 같이 시행한대. 그래서 그에 따른 부작용들에 대해 설명들었어.. 이걸 동의해도 괜찮은 게 맞아?
      fidelity: exact
    assistant:
      text: |-
        [당시 답변 원문 확인 전 요약]

        기관절개는 입안의 기관내관을 제거하고 목의 기관절개관으로 호흡 통로를 전환하는 시술이며, 필요하면 새 관에 인공호흡기를 연결할 수 있다고 설명했다. 시술 직후에는 관의 위치, 출혈, 가래나 점액마개에 의한 막힘, 산소포화도 변화를 집중해서 확인해야 한다고 답했다. 기관지내시경을 실제로 함께 시행했는지와 염증·출혈·배양검사 결과는 의료진에게 따로 확인하도록 정리했다.
      modelLabel: ChatGPT
      fidelity: summary-reconstruction
    sourceRefs:
      - source-trauma-20260812-visible-prompts
      - source-trauma-20260812-nurse
      - source-trauma-20260812-gpt-summary
  - id: exchange-trauma-20260812-002
    recordedAt: { start: "2026-08-11", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        기관내시경의 부작용을 알려줘
      fidelity: exact
    sourceRefs: [source-trauma-20260812-visible-prompts]
amendments:
  - id: amendment-trauma-20260812-000
    recordedAt: { start: "2026-08-12", precision: day, timezone: Asia/Seoul }
    kind: clarification
    target: exchange-trauma-20260812-001
    note: "질문 원문의 ‘내일’과 8월 12일 시술 예정 기록을 연결해 질문 작성일을 8월 11일로 배치했습니다. 원 대화 타임스탬프를 확보하면 다시 확인합니다."
    sourceRefs: [source-trauma-20260812-visible-prompts, source-trauma-20260812-nurse]
  - id: amendment-trauma-20260812-001
    recordedAt: { start: "2026-08-15", precision: day, timezone: Asia/Seoul }
    kind: follow-up
    target: exchange-trauma-20260812-001
    note: "8월 15일에는 기관절개관을 통해 산소를 공급받는 상태가 기록되어 기관절개술 시행 뒤임을 확인할 수 있습니다. 기관지내시경의 실제 시행 여부와 결과는 현재 확보된 원문에서 확인되지 않습니다."
    sourceRefs: [source-trauma-20260815-followup]
media: []
related: [trauma-2026-08-10-alertness-tracheostomy-discussion]
privacyReviewed: true
---
