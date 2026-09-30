export type TemplateId = 'blank' | 'irac' | 'caseBrief' | 'lecture' | 'summary';
export type TemplateLang = 'uk' | 'en';

export const TEMPLATE_IDS: TemplateId[] = ['blank', 'irac', 'caseBrief', 'lecture', 'summary'];

interface TemplateBody {
  title: string;
  body: string;
}

const BODIES: Record<TemplateId, Record<TemplateLang, TemplateBody>> = {
  blank: { uk: { title: '', body: '' }, en: { title: '', body: '' } },
  irac: {
    uk: {
      title: 'IRAC: ',
      body: '## Issue (питання)\n\n\n## Rule (норма права)\n\n\n## Application (застосування)\n\n\n## Conclusion (висновок)\n\n',
    },
    en: {
      title: 'IRAC: ',
      body: '## Issue\n\n\n## Rule\n\n\n## Application\n\n\n## Conclusion\n\n',
    },
  },
  caseBrief: {
    uk: {
      title: 'Справа: ',
      body: '## Обставини справи\n\n\n## Питання\n\n\n## Рішення суду\n\n\n## Обґрунтування\n\n\n## Мої думки\n\n',
    },
    en: {
      title: 'Case: ',
      body: '## Facts\n\n\n## Issue\n\n\n## Holding\n\n\n## Reasoning\n\n\n## My thoughts\n\n',
    },
  },
  lecture: {
    uk: {
      title: 'Лекція: ',
      body: '**Дата:** \n\n## Ключові поняття\n\n- \n\n## Конспект\n\n\n## Питання до викладача\n\n- [ ] \n',
    },
    en: {
      title: 'Lecture: ',
      body: '**Date:** \n\n## Key concepts\n\n- \n\n## Notes\n\n\n## Questions for the lecturer\n\n- [ ] \n',
    },
  },
  summary: {
    uk: {
      title: 'Конспект статті: ',
      body: '**Норма / джерело:** \n\n## Суть\n\n\n## Важливі положення\n\n- \n\n## Приклади\n\n> \n',
    },
    en: {
      title: 'Summary: ',
      body: '**Provision / source:** \n\n## Gist\n\n\n## Key points\n\n- \n\n## Examples\n\n> \n',
    },
  },
};

export function getTemplate(id: TemplateId, lang: TemplateLang): TemplateBody {
  return BODIES[id][lang];
}
