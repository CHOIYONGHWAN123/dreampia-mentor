import { useEffect, useState } from 'react';

import type { UnitOption } from '@/components/program-unit-picker';
import { supabase } from '@/lib/supabase';

export type FieldPptTemplateUrls = { elementary: string | null; secondary: string | null };

export type ProgramCatalog = {
  fields: { id: string; name: string }[];
  occupations: { id: string; name: string; field_id: string | null }[];
  programs: { id: string; name: string; occupation_id: string | null }[];
  units: UnitOption[];
  // 유닛에 PPT 양식이 따로 지정 안 돼 있을 때 쓸 분야별 기본 양식(초등/중고등).
  // 분야가 행사구분과 다대다라 여러 행사구분에 걸치는 경우, 초등/중고등 각각
  // 실제로 양식이 등록된 첫 번째 행사구분의 값을 쓴다(양식이 없는 행사구분이
  // 먼저 매칭돼서 있는 양식을 못 찾는 일이 없도록).
  fieldPptTemplateUrls: Record<string, FieldPptTemplateUrls>;
};

const EMPTY_CATALOG: ProgramCatalog = {
  fields: [],
  occupations: [],
  programs: [],
  units: [],
  fieldPptTemplateUrls: {},
};

export function useProgramCatalog() {
  const [catalog, setCatalog] = useState<ProgramCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    Promise.all([
      supabase.from('fields').select('id, name').order('name'),
      supabase.from('occupations').select('id, name, field_id').order('name'),
      supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
      supabase
        .from('occupation_program_unit')
        .select('id, title, occupation_programs_id, school_level, ppt_templates(file_url)')
        .order('title'),
      supabase.from('field_event_categories').select('field_id, event_category_id'),
      supabase.from('event_categories').select('id, elementary_ppt_template_id, secondary_ppt_template_id'),
      supabase.from('ppt_templates').select('id, file_url'),
    ]).then(([fieldsRes, occsRes, progsRes, unitsRes, fieldEventCategoriesRes, eventCategoriesRes, pptTemplatesRes]) => {
      if (isCancelled) return;

      const templateUrlById = new Map((pptTemplatesRes.data ?? []).map((t) => [t.id, t.file_url]));
      const eventCategoryById = new Map((eventCategoriesRes.data ?? []).map((ec) => [ec.id, ec]));
      const fieldPptTemplateUrls: Record<string, FieldPptTemplateUrls> = {};
      for (const fec of fieldEventCategoriesRes.data ?? []) {
        const ec = eventCategoryById.get(fec.event_category_id);
        if (!ec) continue;
        const current = fieldPptTemplateUrls[fec.field_id] ?? { elementary: null, secondary: null };
        if (!current.elementary && ec.elementary_ppt_template_id) {
          current.elementary = templateUrlById.get(ec.elementary_ppt_template_id) ?? null;
        }
        if (!current.secondary && ec.secondary_ppt_template_id) {
          current.secondary = templateUrlById.get(ec.secondary_ppt_template_id) ?? null;
        }
        fieldPptTemplateUrls[fec.field_id] = current;
      }

      setCatalog({
        fields: fieldsRes.data ?? [],
        occupations: occsRes.data ?? [],
        programs: progsRes.data ?? [],
        units: (unitsRes.data ?? []).map((u) => ({
          id: u.id,
          title: u.title,
          occupation_programs_id: u.occupation_programs_id,
          school_level: u.school_level,
          ppt_template_url: u.ppt_templates?.file_url ?? null,
        })),
        fieldPptTemplateUrls,
      });
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return { catalog, loading };
}
