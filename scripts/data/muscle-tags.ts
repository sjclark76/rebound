// Drafts fine muscle tags (the 23 the body map shows) for an exercise from its name and its existing group tags.
// Anything it has to guess is returned with a `review` note so the unclear ones can be listed for the user.
import { GROUP_OF, type FineMuscle, type Muscle } from "../../src/db/vocab";

export type TagInput = { name: string; primaryMuscles: string[]; secondaryMuscles: string[] };
export type Tags = { primary: FineMuscle[]; secondary: FineMuscle[]; lengthened: boolean; review: string | null };

const has = (name: string, re: RegExp) => re.test(name.toLowerCase());

const LENGTHENED = /romanian|stiff.?leg|good morning|\bfly\b|\bflyes?\b|flye|pullover|skull|overhead.*extension|extension.*overhead|incline.*curl|nordic|deficit|sissy|negative|eccentric|bulgarian|spider curl|preacher|seated.*(leg )?curl/;

type Ctx = { name: string; primary: Set<Muscle>; role: "primary" | "secondary" };
type Rule = (c: Ctx) => { tags: FineMuscle[]; guessed?: string };

const RULES: Partial<Record<Muscle, Rule>> = {
  chest: ({ name }) => {
    if (has(name, /incline/)) return { tags: ["upper chest"] };
    if (has(name, /decline|dip/)) return { tags: ["lower chest"] };
    return { tags: ["upper chest", "lower chest"] };
  },
  shoulders: ({ name, primary, role }) => {
    if (has(name, /lateral|side raise|side lateral|upright.*row/)) return { tags: ["side delts"] };
    if (has(name, /rear|reverse.*fl|back fl|pull apart|row to neck|external rotation|face pull|bent.?over (raise|fly)|bent.?over.*lateral/)) return { tags: ["rear delts"] };
    if (has(name, /front.*raise|front delt|internal rotation/)) return { tags: ["front delts"] };
    if (has(name, /press|arnold|thruster|jerk|handstand|scaption|snatch|log lift|high pull|get.?up/)) return { tags: ["front delts", "side delts"] };
    if (role === "secondary") {
      if (primary.has("lats") || primary.has("middle back") || primary.has("traps")) return { tags: ["rear delts"] };
      return { tags: ["front delts"] };
    }
    return { tags: ["front delts", "side delts"], guessed: "shoulder head unclear from the name" };
  },
  traps: ({ name, role }) => {
    if (has(name, /shrug|upright|clean|snatch|farmer|carry/)) return { tags: ["upper traps"] };
    if (has(name, /face pull|prone|y raise|reverse fl|scapular|retraction/)) return { tags: ["lower traps"] };
    return { tags: ["upper traps"], guessed: role === "primary" ? "traps part unclear from the name" : undefined };
  },
  "middle back": () => ({ tags: ["rhomboids"] }),
  abdominals: ({ name }) => {
    if (has(name, /oblique|twist|side bend|side plank|wood.?chop|windmill|side crunch|bicycle|suitcase/)) {
      return { tags: has(name, /bicycle|crunch/) ? ["abdominals", "obliques"] : ["obliques"] };
    }
    return { tags: ["abdominals"] };
  },
};

const fine = (group: Muscle): FineMuscle[] => (Object.keys(GROUP_OF) as FineMuscle[]).filter((m) => GROUP_OF[m] === group);

export function tagMuscles(e: TagInput): Tags {
  const primaryGroups = new Set(e.primaryMuscles as Muscle[]);
  const notes: string[] = [];
  const expand = (groups: string[], role: "primary" | "secondary"): FineMuscle[] =>
    groups.flatMap((g) => {
      const group = g as Muscle;
      const r = RULES[group]?.({ name: e.name, primary: primaryGroups, role });
      if (r?.guessed) notes.push(r.guessed);
      return r ? r.tags : fine(group).slice(0, 1);
    });
  const primary = [...new Set(expand(e.primaryMuscles, "primary"))];
  let secondary = [...new Set(expand(e.secondaryMuscles, "secondary"))].filter((m) => !primary.includes(m));
  if (primaryGroups.has("abdominals") && has(e.name, /leg raise|knee raise|knee tuck|mountain climber|sit.?up|v.?up|jackknife|hanging|flutter|scissor/) && !secondary.includes("hip flexors")) {
    secondary = [...secondary, "hip flexors"];
  }
  return { primary, secondary, lengthened: has(e.name, LENGTHENED), review: notes.length ? [...new Set(notes)].join("; ") : null };
}
