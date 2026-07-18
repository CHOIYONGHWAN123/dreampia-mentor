import { useEffect, useState } from 'react';

import type { ProgramCategoryOption, UnitOption } from '@/components/program-unit-picker';
import { supabase } from '@/lib/supabase';

export type ProgramCatalog = {
  fields: { id: string; name: string }[];
  occupations: { id: string; name: string; field_id: string | null }[];
  programs: { id: string; name: string; occupation_id: string | null }[];
  units: UnitOption[];
  programCategories: ProgramCategoryOption[];
};

const EMPTY_CATALOG: ProgramCatalog = {
  fields: [],
  occupations: [],
  programs: [],
  units: [],
  programCategories: [],
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
        .select('id, title, occupation_programs_id, program_category_id')
        .order('title'),
      supabase.from('program_categories').select('id, school_level, experience_type').order('sort_order'),
    ]).then(([fieldsRes, occsRes, progsRes, unitsRes, categoriesRes]) => {
      if (isCancelled) return;
      setCatalog({
        fields: fieldsRes.data ?? [],
        occupations: occsRes.data ?? [],
        programs: progsRes.data ?? [],
        units: unitsRes.data ?? [],
        programCategories: categoriesRes.data ?? [],
      });
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return { catalog, loading };
}
