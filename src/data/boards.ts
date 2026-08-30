export const boards = [
  {
    id: 'trauma',
    label: '중증외상 예후',
    shortLabel: '중증외상',
    description: '날짜별 상태, 의료진 설명, 보호자 관찰과 당시 분석',
  },
  {
    id: 'life',
    label: '선진과 함께하는 삶',
    shortLabel: '함께하는 삶',
    description: '편지와 기도, 가족의 기억과 당시의 답변',
  },
  {
    id: 'medical',
    label: '의학 지식',
    shortLabel: '의학 지식',
    description: '질문과 답변, 공개 자료와 후속 정정',
  },
  {
    id: 'rehabilitation',
    label: '재활 준비',
    shortLabel: '재활 준비',
    description: '전원, 병원 비교, 질문과 실무 체크리스트',
  },
  {
    id: 'media',
    label: '자료·미디어',
    shortLabel: '자료·미디어',
    description: '사진, 영상, 문서, 링크와 프로젝트 기록',
  },
] as const;

export type BoardId = (typeof boards)[number]['id'];

export const boardMap = Object.fromEntries(boards.map((board) => [board.id, board])) as Record<
  BoardId,
  (typeof boards)[number]
>;
