---
schemaVersion: 1
recordId: trauma-2026-08-04-pneumonia-neuro-evaluation
board: trauma
entryType: clinical-update
title: "폐렴 치료와 신경학적 평가"
summary: "CT에서 확인된 폐렴 치료, 인공호흡기 유지와 EEG·MRI 계획을 함께 정리했습니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-08-04", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-08-04", precision: day, timezone: Asia/Seoul }
tags: [폐렴, 인공호흡기, EEG, MRI]
sources:
  - id: source-trauma-20260804-chat-summary
    type: chat-conversation
    certainty: reported
    label: "8월 4일 대화 검색 요약(원문 전문 미확보)"
  - id: source-trauma-20260805-physician
    type: physician-report
    certainty: reported
    label: "보호자가 전한 8월 5일 담당교수 설명"
  - id: source-trauma-20260804-gpt-summary
    type: gpt-analysis
    certainty: inferred
    label: "당시 GPT 답변 검색 요약"
exchanges:
  - id: exchange-trauma-20260804-001
    recordedAt: { start: "2026-08-04", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [원문 전문 확인 전 요약 복원]

        CT에서 폐렴이 확인되어 고용량 항생제를 사용하고 인공호흡기를 유지하고 있다. 눈을 뜨고 조금 움직이지만 의식은 없는 상태로 설명받았다. EEG 시행이 언급되었고 MRI도 계획되어 있다.
      fidelity: summary-reconstruction
    assistant:
      text: |-
        [당시 답변 원문 확인 전 요약]

        폐렴과 호흡 상태의 안정, 의식 변화의 반복 관찰이 당장의 핵심이라고 설명했다. 진정제의 영향과 심정지·저산소 가능성이 신경학적 평가를 흐릴 수 있으므로 EEG, MRI와 임상 반응을 함께 보아야 한다고 답했다.
      modelLabel: ChatGPT
      fidelity: summary-reconstruction
    sourceRefs: [source-trauma-20260804-chat-summary, source-trauma-20260804-gpt-summary]
amendments:
  - id: amendment-trauma-20260804-001
    recordedAt: { start: "2026-08-05", precision: day, timezone: Asia/Seoul }
    kind: follow-up
    target: exchange-trauma-20260804-001
    note: "8월 5일 보호자는 ‘전신 CT와 측두 CT를 찍었는데 담당교수님이 심각한 것은 아니라고 했다’고 기록했습니다. 정확한 영상 판독 내용과 검사 명칭은 원문·의무기록 확인이 필요합니다."
    sourceRefs: [source-trauma-20260805-physician]
media: []
related: [trauma-2026-08-01-cardiac-arrest]
privacyReviewed: true
---
