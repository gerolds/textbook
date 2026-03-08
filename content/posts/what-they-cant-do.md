+++
title = "What They Can't Do"
date = 2026-03-08T00:00:00-05:00
description = "LLMs accelerate creative work but introduce failure modes that only the author's judgment can fix."
summary = "LLMs compress research, drafting, and exploration into minutes. They also introduce new ways to fail: excitement without commitment, borrowed judgment, and coherence that quietly decays. The tools are real. The traps are new."
tags = ['craft', 'process', 'AI', 'creativity', 'writing']
categories = ["Essays"]
showToc = true
draft = true
slug = 'what-they-cant-do'
cover = { image = '', alt = '', caption = '' }
+++

LLMs give you a knowledgeable, tireless partner for the parts of creative work that used to cost the most time: research, drafting, restructuring, exploring counterfactuals, generating variants, compressing ideas, changing registers. Work that took days now takes minutes. That is real, and it changes what a single person can attempt.

But the same capabilities introduce failure modes that didn't exist before. Not the familiar failures of bad tools (crashes, wrong answers, garbled output). These are failures of *judgment*: drift, excitement that collapses on contact with commitment, borrowed taste mistaken for your own. The tool is so fluent that it hides the absence of the thing only you can provide.

---

## What got cheap

A few things that were expensive or slow enough to gate creative work are now nearly free.

**Conceptual dialogue.** You can argue with an LLM about an idea for an hour. It will push back, steelman the opposition, find the weak joints. It won't get bored, won't get defensive, won't change the subject. It lacks skin in the game, but it's a better sparring partner than staring at a wall.

**Translation labor.** Turning raw thinking into readable prose used to be the bottleneck. Notes, bullet points, half-formed arguments: shaping these into something a second person could follow took hours. LLMs do this in minutes. They supply the context an author carries in their head but a reader doesn't have. They make ideas *shareable* at a cost that didn't exist two years ago.

[//]: # "INFER: 'two years ago' anchored to the author's notes referencing 2024 as the before state — is this the right timeframe?"

**Variant generation.** Summaries, compressions, extractions, reframings, voice changes, narrative experiments. All cheap now. You can see the same idea from six angles before committing to one. This used to require either collaborators or weeks of solo iteration.

**Exploration.** Counterfactuals, edge cases, "what happens if we invert this assumption." The kind of exploration that requires a patient interlocutor who knows a lot about a lot. The LLM is worse than the best domain expert you could find but better than no one, and it's available at 2 AM.

---

## What got expensive

Everything the tool made cheap used to serve as a proxy for quality. Polish implied effort, effort implied care, care implied the author knew what they were doing. When polish becomes free, it stops filtering for anything. **Surface quality is no longer evidence of structural quality.** Everyone's first draft reads clean now.

This raises the bar on three things that were always important but are now the *only* things that matter:

**Internal rigor.** Does the argument hold? Are the claims earned? Does the structure serve the reader or just fill space? The surface will always look fine now. These are the only questions left.

**Structural quality.** Coherent architecture (sections that build, ideas that compound, a throughline the reader can follow) cannot be generated on request. The LLM will produce something that *looks* structured. But structure requires knowing what matters and what doesn't, and the LLM has no basis for that judgment in the context of *your* project.

**Actual taste.** Knowing what to cut, what to develop, what to abandon, what to protect. The LLM sees what you've given it. It optimizes within the frame. It cannot see what's missing from the frame, or that the frame is wrong.

Each of the failure modes below attacks one of these three. The clifftop undermines structure: you can't build architecture without commitment. The carrot undermines taste: the model's judgment replaces yours. The slow forgetting undermines rigor, because coherence decays past the model's event horizon.

---

## Failure mode: the clifftop

The LLM boosts excitement. You sketch an idea, and within an hour you have an outline, a framework, maybe a full draft. The possibilities feel endless. You're standing on a clifftop looking at a vast jungle of things you might explore.

Then you try to go somewhere specific, and everything collapses.

The problem is *non-commitment*. The LLM helped you build a panoramic view of possibilities without forcing you to choose one. Each dive off the clifftop into the jungle below kills most of what was exciting to look at from above. That's not a flaw in the tool. That's what commitment does: it closes doors. But the tool made it feel like you didn't have to close any.

The fix is to figure out what you actually care about before you involve the LLM. Use it to draw a backdrop, not to build a world you then hope to explore with the LLM as your worldbuilder. A world requires consistency far beyond any single scene or conversation. The model will always overfit to the local problem and fail to maintain coherence past the edge of what it can currently see.

[//]: # "INFER: the 'clifftop' metaphor is the author's original image — kept and expanded as the section anchor."

---

## Failure mode: the carrot

The author has no clear vision. They ask the LLM to sketch a map of possible opportunities. The LLM obliges: here are ten directions, here's a judgment about which ones are strongest, here's a framework for evaluating them.

The author follows that judgment. It feels like progress. It feels like discovery.

It's not. The LLM has no vision. It has no plan. It has no taste. What it offers is a carrot dangled in front of a donkey — the author — who thinks they're on an epic journey of discovery but is running in circles inside village palisades. Each new "insight" from the model is locally plausible and globally aimless. The author feels like they're learning, but they're just consuming the model's confident restatement of their own vague inputs.

**Never ask an LLM for judgment.** Ask it to execute *your* judgment. Ask it to argue against your judgment so you can test it. But if you can't provide the judgment or the taste, the project is already dead. The LLM didn't kill it. It just made the death comfortable.

The prerequisite is taste. Acquire it: from experience, from studying work you admire, from making things and watching them fail. Then use an LLM to move faster. The order matters.

---

## Failure mode: the slow forgetting

This one arrives late, after the tool has proven itself useful.

The author has figured out a productive workflow. The LLM boosts research, sharpens prose, explores alternatives. Real work gets done. Maybe a script, a novella, a game system. Pages accumulate. The project feels alive.

Then, gradually, the LLM starts operating on a narrowing subset of what's been established. It remembers the last few things discussed. It forgets to backtrack, to revise earlier decisions in light of later ones, to integrate. You can tell it to "consider everything." It will enthusiastically agree. Then it will quietly ignore most of what matters.

This is not a mystery. Research on long-context language models shows they struggle to use information in the middle of their input, a pattern documented by Liu et al. as the *"lost in the middle"* problem. Performance is highest when relevant information sits at the beginning or end of the context and degrades when the model must retrieve from the interior. Even models explicitly designed for long contexts show this behavior.

[//]: # "INFER: the author's frustration with the LLM 'forgetting' aligns with the 'lost in the middle' finding (Liu et al., 2023) — added as the empirical grounding for this section."

The practical result: the model's event horizon is smaller than your project. It processes a window. It gives you coherent, confident output within that window. But it cannot hold your whole world in mind. It will not notice that a decision on page 40 contradicts a constraint from page 3. It will not spontaneously revisit.

The fix is engineering, not prompting. Treat the project like a codebase:

- **Hierarchy.** Maintain a top-level document that describes the project's structure, commitments, and constraints. Feed it to the model at the start of every session.
- **Abstraction.** Don't ask the model to hold everything at once. Give it the layer it needs for the current task: the scene, not the whole narrative; the system, not the whole design.
- **Interfaces.** Define how parts of the project connect. When working on one part, tell the model what the adjacent parts expect. Local comments, architecture decision records, cross-references.
- **Encapsulation.** Let each piece be self-contained enough that the model can do useful work on it without needing the full picture. Then integrate at a level the model can't — by hand, with your own judgment.

You are the integrator. The model is a contributor with no memory between sessions and limited memory within them.

---

## The jagged frontier

The failure modes above are specific to creative work, but the underlying pattern is general. Ethan Mollick and collaborators at Harvard and BCG ran a large experiment with hundreds of consultants using GPT-4 on realistic work tasks. The results confirmed something practitioners already sensed: AI capabilities are uneven in ways that don't track intuitive difficulty.

They called this the *jagged frontier*: the irregular boundary between what the model handles well and where it fails. The dangerous zone is just outside the frontier, where the model produces output that *looks* competent but is subtly wrong. Consultants who trusted the model on these tasks performed *worse* than those who worked without AI. They "fell asleep at the wheel."

The consultants who did best used one of two strategies: *centaur* work (clear division of labor: human does this, AI does that) or *cyborg* work (deep interleaving, handing fragments back and forth). Both strategies require knowing where the frontier is. And you only learn that by using the tool enough to get burned.

For creative work (design, writing, worldbuilding, system architecture) the frontier is especially jagged. The model is strong at local coherence, variant generation, and surface quality. It is weak at global coherence, negative-space judgment, and knowing when to stop. The dangerous zone is exactly where most creative ambition lives: at the boundary between "I have an idea" and "I have a project."

---

## What remains yours

The LLM compresses labor. It does not compress judgment. The commitment that survives difficulty, the taste that knows what to cut, the coherence that emerges from one mind holding a whole project. These stay on your side of the line.

- **The LLM draws backdrops. You build worlds.** Use it for scenery, research, variants. The architecture is yours.
- **Excitement is not progress.** If the LLM made you feel like you accomplished something, check whether you committed to anything.
- **Never outsource taste.** If you ask the model what's good, you'll get a plausible answer with no conviction behind it.
- **Engineer your context.** The model forgets. Build systems that remember on its behalf.
- **Polish is dead as a signal.** The only remaining signal is whether the thinking holds.

## Resources

- **[Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)** — Documents the empirical finding that LLMs degrade at retrieving information from the middle of long inputs, grounding the "slow forgetting" failure mode.
- **[Navigating the Jagged Technological Frontier](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4573321)** — The BCG/Harvard study showing that AI capabilities are unevenly distributed across task types, with users performing worse when they trust the model outside its competence boundary.
- **[Centaurs and Cyborgs on the Jagged Frontier](https://www.oneusefulthing.org/p/centaurs-and-cyborgs-on-the-jagged)** — Ethan Mollick's summary of the BCG study, introducing the centaur and cyborg integration strategies.

## Further reading

- [When the Proxy Breaks]({{< ref "posts/writers-room-for-expertise" >}}) — Explores how technology cheapens craft surfaces and what happens when polish stops signaling quality. Directly relevant to the "polish is dead as a signal" argument here.
- [Finding the Commitment]({{< ref "posts/finding-the-commitment" >}}) — On why commitment compounds and why projects fail from lack of direction, not lack of talent. The "clifftop" failure mode is a specific instance of this problem.

[//]: # "COMPOSE SUMMARY: ~1700 words, 8 sections, 2 inferences marked INFER, 2 facts verified via search (Liu et al. lost-in-the-middle, BCG/Harvard jagged frontier study), 0 unresolved VERIFY annotations, 3 resources, 2 further reading. Central idea: LLMs compress creative labor but introduce judgment failures — clifftop excitement, outsourced taste, and slow coherence decay — that only the author's vision and engineering discipline can fix."
