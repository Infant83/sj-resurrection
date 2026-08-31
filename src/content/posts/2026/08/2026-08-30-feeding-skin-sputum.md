---
schemaVersion: 1
recordId: trauma-2026-08-30-feeding-skin-sputum
board: trauma
entryType: clinical-update
title: "영양 1200 재개와 욕창·가래 호전"
summary: "구토 뒤 식사를 다시 시작하고 마약성 진통제를 중단한 가운데 피부와 가래가 호전된 경과입니다."
status: needs-original-check
sensitivity: highly-sensitive
eventAt: { start: "2026-08-30", precision: day, timezone: Asia/Seoul }
recordedAt: { start: "2026-08-30", precision: day, timezone: Asia/Seoul }
tags: [경장영양, 진통제, 발열, 욕창, 가래]
sources:
  - id: source-trauma-20260830-visible-update
    type: chat-conversation
    certainty: confirmed
    label: "현재 확인 가능한 8월 30일 상태 업데이트"
  - id: source-trauma-20260830-nurse
    type: nurse-report
    certainty: reported
    label: "보호자가 전달받아 기록한 치료 경과"
  - id: source-trauma-20260830-context-summary
    type: chat-conversation
    certainty: reported
    label: "8월 30일 대화 검색에서 함께 확인된 영양 1200·ANC 요약"
  - id: source-trauma-20260830-gpt-summary
    type: gpt-analysis
    certainty: inferred
    label: "당시 GPT 상태 정리 검색 요약"
exchanges:
  - id: exchange-trauma-20260830-001
    recordedAt: { start: "2026-08-30", precision: day, timezone: Asia/Seoul }
    user:
      original: |-
        [현재 확인 가능한 원문 부분]

        1. 환자 상태 및 치료 경과 업데이트

        의료진은 환자(선진)의 전반적인 상태에 대해 다음과 같이 공유했습니다.

        - 식사 및 약물 조절: 어제 구토 증상이 있어 콧줄을 통한 식사를 중단했으나, 오늘 교수님의 지시로 다시 시작했습니다. 구토의 원인으로 추정되는 마약성 진통제는 중단하고 현재는 진정시키는 약물만 투여 중입니다. 환자는 아파서 소리 지르는 것 없이 편안해 보인다고 합니다.
        - 발열 관리: 이전에 있던 발열 증상은 많이 줄어들어 36도대를 유지했으나, 마지막 측정 시 37.5도로 약간 올라 얼음주머니를 대고 있습니다.
        - 욕창 치료: 피부과 확인 결과, 엉덩이 쪽 습했던 부위와 코 쪽 욕창 모두 호전되어 관련 치료는 종료되었습니다.
        - 가래 처치: 가래의 양은 며칠 전보다 줄었지만, 환자가 힘들어하는 관계로 조금씩 자주 제거해주고 있습니다.
      fidelity: summary-reconstruction
    assistant:
      text: |-
        [당시 답변 원문 확인 전 요약]

        콧줄 영양을 1200까지 다시 시작했고 마약성 진통제를 중단한 점, 체온이 36℃대에서 37.5℃로 변한 점, 엉덩이와 코의 피부 치료가 종료된 점, 가래 양은 줄었지만 자주 제거하고 있다는 점을 경과의 핵심으로 정리했다. 일반병실 이동은 다음 회진에서 논의할 예정이지만 아직 확정되지 않았다고 구분했다.
      modelLabel: ChatGPT
      fidelity: summary-reconstruction
    sourceRefs:
      - source-trauma-20260830-visible-update
      - source-trauma-20260830-nurse
      - source-trauma-20260830-context-summary
      - source-trauma-20260830-gpt-summary
amendments:
  - id: amendment-trauma-20260830-001
    recordedAt: { start: "2026-08-30", precision: day, timezone: Asia/Seoul }
    kind: clarification
    target: exchange-trauma-20260830-001
    note: "영양 1200의 단위는 현재 확보된 요약에 남아 있지 않아 임의로 보완하지 않았습니다. ANC는 최저 0.57에서 16.8, 이날 새벽 13점대로 회복했다는 별도 요약이 있으나 원문·단위 확인 전에는 본문 수치로 합치지 않습니다."
    sourceRefs: [source-trauma-20260830-visible-update, source-trauma-20260830-context-summary]
media: []
related: [trauma-2026-08-29-recovery-monitoring]
privacyReviewed: true
---
