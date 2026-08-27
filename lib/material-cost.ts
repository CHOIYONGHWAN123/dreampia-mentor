// material_fee_payer_id(재료비 입금자)가 본인이면 재료비를 정산받는다. prep_by(누가 준비하는지)와는
// 별개 개념이라, 실제 판단은 반드시 material_fee_payer_id로 한다. dreampia_material_cost(드림피아
// 원가)는 강사에게 노출하면 안 되므로 이 함수는 애초에 참조하지 않는다 — 드림피아가 준비하거나
// 본인이 입금자가 아니면 강사 부담은 0원이다.
export function getMentorMaterialCost(
  row: { material_fee_payer_id: string | null; mentor_material_cost: number | null },
  mentorId?: string | null
): number {
  if (!mentorId || row.material_fee_payer_id !== mentorId) return 0;
  return row.mentor_material_cost ?? 0;
}
