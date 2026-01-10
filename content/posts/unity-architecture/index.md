+++
title = "Unity Architecture for Growing Projects"
date = 2026-01-09T00:00:00-01:00
description = "A modular architecture that works with Unity's grain: modules, hosts, contracts, and orchestration for scaling from prototype to production."
summary = "Unity makes spaghetti easy to start and painful to unwind. This article describes an architecture that keeps editor-friendly workflows while adding explicit structure for ownership, lifecycle, and dependencies; scaling by changing rigor, not model."
tags = ["architecture", "unity", "game-development", "software-design"]
categories = ["Essays"]
showToc = true
draft = false
slug = "unity-architecture"
cover = { image = '', alt = '', caption = '' }
+++

## Premise

Successful games often have the worst codebases. Not because the teams were bad, but because success came fast; fast enough that the prototype became production before anyone could make it sustainable.

You know the symptoms. Iteration slows to a crawl. More time goes to bugs than features. New hires take months to become productive. Certain systems are owned by "the only person who understands it." Some code has an unspoken rule: *don't touch it.* Everything depends on everything; logically, structurally, and through assumptions nobody wrote down. What should be a module is actually a tangle of implicit behaviors wired through the editor, and untangling it would cost more than the feature is worth.

None of this happens because Unity is bad. It happens because Unity optimizes for starting fast. Scenes, prefabs, serialized references, `GetComponent`, lifecycle callbacks; these make the first month effortless. But they create invisible coupling. Any object can find any other object. State scatters across the hierarchy. Dependencies live in serialized fields that only the editor knows about. By month six, you've built a machine that works but that nobody fully understands.

This article describes an architecture that works *with* Unity's grain (keeping editor-friendly workflows and fast iteration) while adding structure that makes ownership, boundaries, and dependencies explicit. The architecture scales from prototype to production by changing *rigor*, not *model*. The same principles apply at every stage; what changes is how strictly you enforce them.

### The core idea: hosts as membranes

> ![alt text](images/unity-architecture-membrane.png)
>
> Picture a living cell. The cell membrane isn't a wall, it is a selective boundary. It controls what enters (nutrients, signals), what exits (waste, messages), and what belongs inside (the cell's machinery). The membrane doesn't block communication; it mediates it. Without the membrane, the cell's contents would dissolve into the environment. With it, the cell maintains identity and can cooperate with other cells without losing itself.
>
> The cell is a module, a living unit that the membrane defines and protects. When molecules pass through the membrane, they enter the cell's domain. The cell receives them, integrates them into its machinery, and puts them to work. The cell knows what's inside, maintains its own state, and is the authority for its own function. Other cells don't reach in and manipulate its internals, they send signals through the membrane.

In this architecture, the **host is the module's membrane**. It's the boundary you pass through to belong, the thing that equips you when you enter, and the surface through which the module communicates with the outside world. The host isn't just a class that ; it's the answer to "who owns this?", "how do I join?", and "how do I talk to this module?" If you can point to the host, you can understand the module's shape.

- **Everything participates by belonging to a host.** Scene objects, spawned prefabs, loaded content--they don't just exist--they belong to a module by registering with its host. "Registration" is conceptual: for a component, it might be a formal call; for a pooled object, it might just be "this pool belongs to Combat."
- **Registration is the handshake.** When something joins a module, the host gives it context (dependencies, configuration). The object doesn't fish for these later.
- **Communication crosses the membrane through contracts.** Modules don't reach into each other's internals. They talk through the host's public surface.
- **The host owns what's inside.** State, lifecycle, persistence; the host is the authority. If you need to save, enumerate, or debug, you ask the host.

This concept generates everything else in this article. Read it as orientation, not prescription: the specific mechanisms (DI containers, manual wiring, singletons-with-discipline) vary by project. The principle stays the same.

### What this gives you

The goal is a codebase where:

- New team members can learn one module at a time.
- Persistence is straightforward because state has clear owners.
- Debugging starts with "what did this module see?" not "what is everything connected to?"
- Prototyping and production feel like points on a continuum, not different worlds.

### This is not OOP architecture

This architecture uses objects because C# and Unity use objects. But the pattern itself is not object-oriented in the design-patterns sense.

The principles apply regardless of paradigm:

- In **MonoBehaviour-heavy code**, hosts are often MonoBehaviours that coordinate other MonoBehaviours.
- In **ECS/DOTS**, a system *is* the host: it's the authority for a slice of logic. Components are data; systems own the processing. The membrane is the system's public queries and events.
- In **Unreal**, Subsystems fill the host role. In **Godot**, Autoloads can serve similarly.

The mechanisms differ; the principles (ownership, boundaries, defined surfaces for communication) stay the same. What you see here uses Unity's MonoBehaviour vocabulary, but the mental model travels.

### What this means for solo developers

If you are working alone on a short project, most of this is optional. You do not need assembly separation, formal contracts, or explicit orchestration. You can use singletons freely. The cost of unwinding assumptions is bounded by the project's lifespan and your own memory.

What helps even solo:

- **Thinking in modules.** Even informal boundaries help you reason about "where does this live?" Folders that correspond to responsibilities make it easier to find code six months later.
- **Init-only dependency capture.** Storing references during `Awake` and never fishing for them at runtime prevents mysterious ordering bugs.
- **Plain data for state.** If you ever want to save, replay, or debug, having state in plain objects instead of scattered across MonoBehaviours pays off immediately.

What you can skip:

- Formal interfaces and contracts. Public methods are fine.
- Assembly definitions. One assembly is fine.
- Explicit orchestration layer. Let Unity's scene loading be your orchestrator.

The architecture is a direction, not a destination. Solo projects can travel light. It's worth considering, however, that as your solo project grows, you may have to look at yourself as a different developer if you can't keep all details in your head anymore. Then this architecture helps protect you from yourself.

Also, once certain modules mature and turn into reusable libraries that are portable between projects that are all built with this mindset, you can prototype quickly while using production-ready infrastructure for the generic bits.

### How dynamics change as teams grow

Architecture pressure comes from coordination costs, not code volume.

**Solo / pair:** You hold the whole system in your head. Informal conventions work. Singletons are fine because you know who uses them. The cost of changing anything is low because you are the only one who needs to know.

**Small team (3–6):** You can no longer assume everyone knows everything. Implicit dependencies start causing surprises: "I didn't know that singleton was being used there." Code review catches some issues, but reviewing every line is expensive. This is when explicit module boundaries start paying off, not for the compiler, but for human communication. "Inventory is Alice's. Talk to her before touching it."

**Larger team (7+):** Verbal coordination doesn't scale. You need boundaries the compiler enforces. Assembly definitions, explicit contracts, formal ownership. New hires need to learn one module at a time without understanding the whole codebase. The architecture becomes documentation: the dependency graph tells you what talks to what.

**Multi-team / long-lived project:** Modules become team boundaries. Contracts become APIs that teams negotiate. The orchestration layer is the integration point where separately-developed modules meet. Architecture is now governance.

The same mental model applies at every scale (modules, hosts, contracts, orchestration), but the enforcement mechanisms escalate. Start informal. Add rigor when coordination costs demand it.

---

## The target architecture

The stable shape looks like this:

1. **Modules**: coherent slices of functionality (inventory, combat, dialogue, save/load). Each does one thing you can name in a sentence.

2. **Hosts**: the entry point and state owner for each module. A host is a long-lived object (often a MonoBehaviour, sometimes a plain C# class) that coordinates the module's internals and exposes its public surface.

3. **Contracts**: the narrow public interface of each module. Other code talks to contracts, not to internals. Contracts are typically interfaces or small data types in a shared assembly.

4. **Orchestration layer**: the composition root that creates or loads hosts, controls their lifetimes, defines startup order, and wires contracts to implementations. This is the one place that knows about everything.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                      │
│  (creates hosts, controls lifetimes, wires contracts)       │
└─────────────────────────────────────────────────────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Module  │   │ Module  │   │ Module  │   │ Module  │
   │ (Host)  │   │ (Host)  │   │ (Host)  │   │ (Host)  │
   │         │   │         │   │         │   │         │
   │ state   │   │ state   │   │ state   │   │ state   │
   │ logic   │   │ logic   │   │ logic   │   │ logic   │
   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │             │
        └─────────────┴───────┬─────┴─────────────┘
                              ▼
                  ┌─────────────────────┐
                  │     Contracts       │
                  │ (shared interfaces) │
                  └─────────────────────┘
```

Modules communicate through contracts. The orchestration layer is the only code that references all modules. This keeps coupling explicit and one-directional.

### Why legibility matters: the city metaphor

![City](images/city.png)

To understand why these constraints matter, picture a large Unity project as a city. The problem in most Unity cities is that any building can build a private road to any other building. At first it feels efficient. Later you discover you cannot reason about traffic, you cannot reroute, and you cannot tell which roads are essential and which are accidental.

Architecture is deciding where the districts are, what roads are allowed to cross districts, and where the entry points are. You are not trying to eliminate roads; you are trying to make the road network legible.

A "module" is one district. Inventory is a district. Combat is a district. Dialogue is a district. Save/load is a district. UI shell is a district. The exact partitioning is less important than the fact that you commit to one and keep it stable. Each district must be coherent: most of what it does should be explainable with one sentence.

### What changes from prototype to production

The principles stay the same. What changes is how explicit you make them:

| Stage          | Modules                | Hosts                   | Contracts                  | Enforcement |
| -------------- | ---------------------- | ----------------------- | -------------------------- | ----------- |
| Prototype      | Folders, conventions   | MonoBehaviours          | Implicit (public methods)  | Social      |
| Vertical slice | Named responsibilities | Own state as plain data | Deliberate interfaces      | Code review |
| Production     | Assembly-separated     | Formal lifecycle        | Shared assembly            | Compiler    |

A prototype host might just be "the MonoBehaviour that holds this feature's state." A production host might have formal lifecycle methods, assembly isolation, and tooling. The *principle* (this is the authority for this slice) is identical; the *rigor* scales with coordination cost.

### Host-scenes: game modes as isolated worlds

In a production project, the top-level organization is **host-scenes**: Unity scenes that represent completely independent game modes. Each host-scene is a self-contained world with its own lifecycle, hosts, and orchestration. Examples:

- **App-startup**: splash screens, platform initialization, profile selection.
- **Main menu**: title screen, settings, save-slot selection.
- **Single-player**: the core gameplay loop for a solo campaign.
- **Multiplayer**: networked gameplay with its own connection lifecycle.
- **Free-roam / sandbox**: exploration mode with different rules.
- **Credits / cinematics**: linear sequences with minimal interactivity.

These modes are **conceptually decoupled**. They share no runtime lifecycle. When you transition from menu to single-player, you unload one world and load another. State that must survive (player profile, selected save slot, network session) travels via a small persistent layer or is passed as initialization parameters—not through shared singletons that span modes.

**What lives in a host-scene:**

1. **All host instances for that mode.** Inventory, combat, dialogue, UI—whatever modules the mode needs. Hosts are loaded with the scene and destroyed with the scene.

2. **A bootstrapper.** A single MonoBehaviour that initializes the mode. It receives minimal signalling: perhaps a save-slot ID to load, or a flag for "new game." From there, it:
   - Clears and populates the service locator for this scope.
   - Initializes hosts in dependency order.
   - Triggers the initial state transition.

3. **A play-mode state machine.** An authoritative FSM that orchestrates mode-wide concerns: input routing, cursor state, UI layers, time scale, pause behavior, network readiness. This is the single place that knows "what phase of gameplay are we in?" Hosts query or subscribe to it; they do not independently manage global state.

4. **Persistence and scenario initialization.** The mode knows how to hydrate itself from a save file or initialize a fresh run. This is not an afterthought; it is part of the bootstrapper's responsibility.

**What does NOT live in a host-scene:**

The host-scene contains only **infrastructure**; the hosts and orchestration that will manage gameplay. It does not contain gameplay content itself.

Levels, enemies, items, NPCs, interactables; all of this is **loaded additively** into the host-scene's scope. A level scene loads on top of the host-scene. Prefabs spawn at runtime. Addressables stream in as needed. None of this content exists in the host-scene asset.

This is where **self-registration** does the heavy lifting. When a content scene loads or a prefab spawns, its components discover the active hosts (via the service locator) and register themselves. The host-scene does not need to know what content will arrive; it only needs to be ready to receive it.

This separation has major workflow benefits:

- **Content teams work independently.** Level designers build levels in their own scenes. Character artists set up prefabs. Environment artists place props. None of them edit the host-scene.
- **Content modules integrate cleanly.** A new enemy type, a new weapon, a new interactable; each is a prefab or scene that self-registers with the appropriate hosts. If it implements the right components, it just works.
- **Iteration is fast.** You can test a single level by loading the host-scene and then additively loading just that level. You do not need to boot through menus or load the entire game world.
- **Memory is predictable.** Content loads and unloads while hosts persist. You can stream levels without tearing down the mode's infrastructure.

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Host-Scene (e.g., Single-Player)           │
├─────────────────────────────────────────────────────────────────┤
│  Bootstrapper                                                   │
│    • receives init params (save ID, mode flags)                 │
│    • populates service locator                                  │
│    • initializes hosts in order                                 │
│    • triggers PlayModeFSM.Start()                               │
├─────────────────────────────────────────────────────────────────┤
│  PlayModeFSM (authoritative mode orchestrator)                  │
│    • states: Loading → Playing → Paused → Cutscene → ...        │
│    • owns: input routing, cursor, time scale, UI layer stack    │
├─────────────────────────────────────────────────────────────────┤
│  Hosts                                                          │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│    │Inventory │ │ Combat   │ │ Dialogue │ │ UI Shell │ ...      │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Content (loaded additively, self-registers with hosts)         │
│    • level scenes, spawned prefabs, streamed assets             │
│    • not part of the host-scene asset itself                    │
└─────────────────────────────────────────────────────────────────┘
```

**Why this matters:**

- **Clean unload.** When the mode ends, you destroy the scene. All hosts, all registered components, all scoped state; gone. No lingering singletons, no manual cleanup lists.
- **Parallel development.** Teams can work on different modes without stepping on each other. The menu team and the gameplay team load different host-scenes.
- **Testability.** You can load a host-scene in isolation, pass it test parameters, and verify behavior without booting the entire game.
- **Mode-specific optimization.** Each mode loads only the hosts it needs. A credits sequence does not initialize combat.

The cost is that cross-mode communication must be explicit. You cannot call into "the inventory" from the menu unless you design a deliberate handoff. That constraint is the point: it forces you to decide what state survives transitions and how.

---

## Unity's instantiation reality (and the compromise that works)

![Registration](registration.png)

Unity instantiates things from content: scenes, prefabs, additive loading, Addressables. If you insist that a central orchestrator must explicitly construct every gameplay object, you end up writing spawners for everything and fighting iteration.

The compromise that scales is:

- The orchestration layer creates or loads **hosts** and establishes **scopes** to which they bind.
- Unity-instantiated components **self-register** with the appropriate host during initialization.
- After registration, the host injects them with dependencies and the components never again look-up dependencies on their own.

This keeps workflows editor-friendly while still making ownership and boundaries explicit.

## Why init-time resolution matters

The membrane model implies a specific constraint: **resolve dependencies only during initialization, store them, and never resolve again.**

This isn't arbitrary; it's a direct consequence of "registration is the handshake." If components could resolve dependencies at any time, they would bypass the host, and the membrane would become porous. Runtime dependency fishing reintroduces hidden coupling, just behind a nicer API.

The safe rule:

> Scene objects find their host and resolve contracts **only during initialization**. After that, they use stored references.

That constraint blocks the worst failure mode: invisible dependencies that appear mid-gameplay, untraceable in code review, and brittle to ordering changes.

## Dependencies should always be ready

What if a dependency isn't ready yet? In this model, it should be.

The orchestration layer's job is to ensure that by the time anything initializes, the hosts it depends on already exist and are ready. This is a design constraint that serves games well: predictable memory, predictable timing, fewer frame spikes.

If something truly must load asynchronously, orchestration should await it *before* allowing dependents to initialize. Avoid architectures where "asking for a thing" silently constructs it. This only causes surprises when such requests begin to cascade. It complicates reasoning about lifecycle and makes dependencies brittle.

## Explicit lifecycle beats superstition

Many Unity projects don't fail because Unity has callbacks; they fail because callbacks become an implicit scheduler.

Hosts make lifecycle explicit:

- `Awake`/`OnEnable` is for finding the host and registering.
- Registration triggers dependency injection.
- A deliberate initialization phase transitions modules to "running".
- Update order is owned by a single place, not emergent behavior.

When order is explicit, sequencing bugs stop being mysterious.

## Commands, queries, and events

Global event buses are tempting because they let you communicate without designing contracts. In practice they create hidden dependencies and brittle order constraints.

Keep these separated:

- **Command:** do something (may fail, may have ordering).
- **Query:** ask for data (no side effects).
- **Event:** announce something happened (observers optional).

Let modules accept commands/queries through their contracts. If modules expose events, expose them deliberately and typed (as part of the contract), not as a global publish-anything mechanism.

A well-designed event is part of a host's contract:

```csharp
public interface ICombatEvents
{
    event Action<DamageEvent> OnDamageDealt;
    event Action<Entity> OnEntityDied;
}
```

Subscribers are explicit: a module that cares about combat outcomes takes a dependency on `ICombatEvents` during initialization and subscribes. There is no anonymous broadcast; the dependency is visible in the code.

## The physical world as a shared channel

Beyond host contracts, there is another communication channel: the physical world itself. Think of it as a **shared telephone line** that any module can use, but with a specific protocol.

Unity's physics engine (triggers, raycasts, overlap queries, collision callbacks) is a built-in spatial index. It answers questions like "what is near this point?" or "what entered this volume?" efficiently and with designer-friendly tooling. Most games should use it. The question is: how does spatial discovery fit into modular architecture?

### The protocol: modules encode their own discovery

Each module that wants to be discoverable through physics **defines its own marker components**. These components live inside the module; the queries that look for them also live inside the module. The module owns both sides of the conversation.

Example: the **Combat module** wants projectiles to find damageable targets.

1. Combat defines `DamageReceiver`: a MonoBehaviour that marks "I can take damage" and holds a reference to the entity's health data.
2. Combat's projectile logic performs a raycast or overlap query.
3. The query looks for `DamageReceiver` components (via `GetComponent` or layer filtering).
4. When found, the projectile calls methods on `DamageReceiver`—a component the Combat module owns.
5. `DamageReceiver` updates the entity's health through Combat's internal systems.

The key insight: **the querying code and the discovered component belong to the same module**. Combat queries for Combat's own marker. It does not query for some global `IDamageable` interface that other modules might implement. The module encodes its discovery protocol and operates entirely within its own boundaries.

### Multiple modules, same physics world

Different modules can attach different marker components to the same GameObject. A character might have:

- `DamageReceiver` (Combat module) for taking damage.
- `InteractionTarget` (Interaction module) for player interaction prompts.
- `AIPerceptionTarget` (AI module) for enemy detection.

Each module queries for its own markers. Combat raycasts look for `DamageReceiver`. Interaction raycasts look for `InteractionTarget`. AI perception queries look for `AIPerceptionTarget`. The modules share the physics world but not each other's components.

This is the "shared telephone line" model: everyone uses the same wire (Unity's physics), but each module speaks its own language (its own component types). There is no cross-talk because each module only listens for messages it defined.

### When modules need to coordinate spatially

Sometimes spatial events need to cross module boundaries. A projectile (Combat) hits something that triggers a dialogue (Dialogue module). In this case:

1. The spatial discovery still happens within one module. Combat finds its `DamageReceiver`.
2. The cross-module communication happens through contracts. `DamageReceiver` processes the hit, and if the target dies, Combat raises an event or the dialogue system observes health state through Combat's contract.

The physics query does not directly invoke another module's code. It invokes the querying module's own component, and that component may then communicate through proper contract channels.

### MonoBehaviours as spatial markup

Even if you move most logic out of MonoBehaviours and into hosts, MonoBehaviours remain essential for spatial games. They are Unity's way of attaching data to positions in the scene. For physics-based discovery, you need:

- **Trigger volumes** with MonoBehaviours that respond to `OnTriggerEnter/Exit`.
- **Collider components** that can be queried via raycast or overlap.
- **Marker components** that identify what a GameObject means to a particular module.

These MonoBehaviours are thin: they hold data, implement callbacks, and delegate to their module's host or systems. They are "spatial markup"; the module's way of saying "this point in space participates in my domain."

The physical world is not a back door around the architecture. It is a *discovery mechanism* that each module uses independently, with coordination happening through contracts when needed.

## Data ownership

When two parts of the game care about the same data, pick an owner.

If both combat and UI need health, one module owns the canonical health value. Combat issues commands (apply damage). UI observes changes. Shared mutable state accessed from everywhere is how coupling sneaks back in.

If two modules both need to write the same field, your boundaries are wrong, or you need a third module to own that field.

Note that **entities are not modules**. A player character, an enemy, a vehicle; these are *things that modules operate on*, not modules themselves. A character might have a `DamageReceiver` (belonging to Combat), an `InventoryHolder` (belonging to Inventory), and a `CharacterMotor` (belonging to Movement). Each component belongs to its module; the entity is an assemblage of components. The question "which module owns the player?" is usually malformed; modules own *aspects* of entities, not entities themselves.

## Premature abstraction is the root of all evil

Abstractions are not free. Every interface, every indirection, every "what if we need to swap this later" adds cognitive load. The architecture described here uses contracts and interfaces, but those should be *earned*, not pre-emptive.

The rule: **start concrete, abstract when you understand the compression.**

A good abstraction is a compression of meaning. It takes several concrete cases and finds the narrow API that captures what they have in common while hiding what differs. You cannot find that compression until you have seen the concrete cases. Abstracting before you understand the problem creates interfaces that are either too narrow (and you bypass them) or too wide (and they constrain nothing).

In practice:

- **First implementation:** write concrete code. `InventoryHost` has methods that do exactly what inventory needs. No interface yet.
- **Second use case:** if another module needs to talk to inventory, you can extract an interface, but only the methods actually needed. The interface is discovered, not designed.
- **Reusable systems:** when you see the same pattern three times, you might extract a generic system. Now an abstraction earns its keep because it compresses real duplication.

Contracts between modules are not premature abstraction; they are boundaries. The interface `IInventoryQueries` exists to define what inventory exposes, not to enable hypothetical swapping. The abstraction cost is paid for by the architectural benefit of explicit boundaries.

But *within* a module, resist the urge to abstract early. A module's internals can be messy, concrete, and pragmatic. The architecture protects the rest of the codebase from that mess. Clever local chaos that works is fine; clean it up when you understand it, not before.

## What happens inside a module

This architecture governs boundaries and orchestration. It does not govern what happens inside a module.

Inside a module, you can do whatever you need to solve the problem cleanly and performantly. You can use inheritance, composition, ECS-style data layouts, state machines, coroutines, Jobs, Burst, whatever fits. The module's host owns the problem; the implementation is up to whoever owns the module.

This is liberating. A module is a protected space. As long as you respect the contract at the boundary, you have freedom to experiment, refactor, or rewrite internals without coordinating with the rest of the team. The architecture gives you ownership and protection.

It also means you can adopt different styles in different modules. A combat module might use a tight ECS-like data layout for performance. A dialogue module might use a simple state machine. A save module might be pure functions. Each module can be idiomatic to its problem.

The architecture's job is to make sure these different styles don't leak across boundaries. Contracts are the membrane. Inside, do what works.

## The singleton trap: designing for multiplicity

One of the most expensive early assumptions is uniqueness: there is one player, one UI, one camera, one inventory. This assumption simplifies everything, until it doesn't.

You do not need multiplayer to hit this wall. Single-player games routinely break singleton assumptions:

- **Vehicles and shells.** The player enters a mech, drives a car, sits at a workstation, possesses an NPC. Suddenly "the player" is two things: the identity and the current shell. If PlayerController is a singleton, you cannot cleanly transfer control.
- **Mode changes.** A JRPG switches between world traversal and turn-based combat. Each mode has different input handling, different UI, different camera behavior. If these systems assume they are *the* system, mode transitions become a tangle of enable/disable flags.
- **Minigames.** The player enters a fishing minigame or a hacking puzzle. For the duration, a different set of systems handles input and displays different UI. If the main systems are singletons that assume they're always active, you spend more time suppressing them than building the minigame.
- **Companions and AI.** NPCs that use player-like systems (health, inventory, abilities). If those systems are hardcoded to "the player," you duplicate code or hack around the assumption.
- **Multiple views.** Split-screen, minimaps, picture-in-picture, UI panels showing two characters' stats side by side. If Camera or UI are singletons, each additional view is a special case.

The pattern is the same: what seemed unique turns out to be an instance of a category. The earlier you design for that possibility, the less rewriting you do later.

### Shells and control transfer

The avatar is not the player. A player is an identity (a save slot, a profile, an input source) that might control different avatars over time. The avatar (or "shell") is what the player currently controls: a character, a vehicle, an interface.

Systems that conflate player and avatar will break the moment control transfers. Health belongs to the avatar, not the player identity. Input goes from the player identity to whatever shell is currently receiving it. When the player enters a vehicle, input reroutes to the vehicle controller; the character's controller receives nothing until the player exits.

This is not about multiplayer. This is about single-player games where you pilot a mech, possess an enemy, switch party members, or sit at an in-game terminal.

### Assume multiplicity, even if you ship one

Structure systems so they operate on *a* thing, not *the* thing. Health is not `PlayerHealth.Instance.Current`; it is a health component belonging to an entity that might be player-controlled. Inventory is not a singleton; it is owned by something that can be queried. Input does not go directly to "the player controller"; it goes to whichever entity is currently receiving input from a particular source.

The concrete instance might be unique at runtime; you might only ever have one player, one active camera, one inventory. But the *code* should not assume that. Pass the reference; don't call the singleton.

### Everything dynamic needs a spawner

If gameplay objects can be created at runtime (enemies, projectiles, items, effects), they need a spawner that owns their lifecycle. The spawner is the host for that category of dynamic content. It creates, tracks, and destroys instances. It can answer queries like "how many active enemies?" or "give me all projectiles in this area."

Without spawners, dynamic content becomes untracked. You lose the ability to enumerate, save, or reason about what exists. When you need to implement "pause all enemies" or "serialize all active projectiles," you discover that nothing knows what's alive.

Note: this is an escalation, not a foundational requirement. Early on, Unity's content-driven instantiation is fine; prefabs spawn, self-register, and participate in the architecture. As the project grows and you need enumeration, persistence, or pooling, you formalize spawners.

For high-frequency content (thousands of projectiles, particles), "registration" adapts to the mechanism: the *pool* belongs to the host, not each individual instance. Activation and deactivation happen within the pool; the principle ("everything belongs somewhere") holds without per-object overhead.

### Everything discoverable without static references

Except for host-to-host communication (which goes through contracts), nothing should rely on static references to find its context. A component that needs the local player's health should receive that dependency through injection or registration, not through `Player.Instance`.

This forces you to design context-aware APIs. A UI panel does not ask for "the inventory"; it receives a reference to *an* inventory when opened. A damage system does not assume "the player"; it operates on whatever entity was hit. The system becomes reusable because it makes no assumptions about the global shape of the game.

### Actions need context: actor, target, view

Every system that performs an action should be built with the assumption that the action needs context. At minimum:

- **Actor**: who or what is performing the action.
- **Target**: who or what is affected.
- **View**: how is this being presented, and to whom.

A damage event is not "deal 10 damage." It is "actor A deals 10 damage to target B, and here is the view context for feedback." A UI update is not "show health." It is "show this entity's health in this panel for this observer."

This pattern scales gracefully. When the player enters a vehicle, the actor changes but the action system doesn't care. When you add a companion with their own health bar, the view context routes to a different panel. When you add replay, the view can be suppressed or redirected. When AI uses the same combat system as players, the actor slot accepts AI controllers seamlessly.

### When multiplicity matters (and when it doesn't)

Not all code needs to support multiplicity. The question is whether the code will be reused.

**Project-specific scripting** (the glue code, the one-off behaviors, the "this level does something special" scripts) can assume singletons freely. This code is disposable. If assumptions break, you rewrite it. The cost is bounded.

**Reusable systems** (code intended to survive across projects or become part of a shared library) should be designed for multiplicity from the start. A stat system, a damage pipeline, an ability framework: these are investments. If they assume singularity, every project that uses them inherits the assumption. The cost compounds.

Multiplicity is one of the clearest signals that a prototype needs to be thrown away and rebuilt. A prototype player controller that assumes "the player" is fine for proving out mechanics. When you need vehicles, or companions, or mode switches, you do not refactor; you rewrite. Finding the right moment to throw out the prototype is difficult under real-world constraints. Prototypes tend to survive too long, and the cost of unwinding singleton assumptions under deadline pressure is high.

The honest advice: if you are building a one-off prototype, use singletons. If you are building something you expect to reuse or extend, design for multiplicity. If you are unsure, notice the moment when the singleton assumption starts hurting, and treat that as the signal to rebuild.

### This is design, not implementation

None of this requires building vehicle systems or multiplayer infrastructure. It requires **not cementing assumptions**. You can ship a single-player game with one player, one inventory, one camera. But if your systems accept context rather than assuming globals, adding a vehicle later is "create a new shell and reroute input," not "rewrite everything that touches player state."

The cost of designing for multiplicity is minimal; you pass a reference instead of calling a singleton. The cost of assuming singularity is measured in weeks or months when the assumption breaks.

## Cross-cutting concerns

Logging, input, time, and analytics are services many modules use but that do not belong inside any domain module. Treat them as **infrastructure contracts**: interfaces that the orchestration layer provides and binds to implementations at startup.

This differs from domain contracts (like `IInventory` or `ICombat`), which are provided by hosts. Infrastructure contracts are provided by the orchestration layer itself; they exist before any domain host initializes and remain stable for the scene's lifetime.

- **Input** translates raw Unity input into game-meaningful actions.
- **Time** provides pausable, scalable game time.
- **Logging** and **Analytics** accept calls without modules knowing how data is stored or sent.

These contracts live in a shared assembly. Cross-cutting concerns become explicit dependencies, not invisible singletons.

The benefit is testability and swappability. When you want to record a replay, you swap the input contract for a playback implementation. When you want to fast-forward time in a test, you swap the time contract. When you ship to a platform without analytics, you swap for a no-op. None of this requires touching the modules that consume the contracts.

## Third-party code and static APIs

Unity's own APIs are full of static access: `Time.deltaTime`, `Input.GetKey`, `Physics.Raycast`. Third-party assets often use singletons. This is not a problem to fight; it's a reality to work with.

Static APIs and singletons are often a necessary constraint in games. They provide global access to things that are genuinely global: the physics engine, the render pipeline, platform services. We do not reject them. We do work to respect what makes them valuable (simplicity, predictability, single source of truth) while protecting them from abuse.

The pattern: wrap external singletons in modules that adapt them to your contracts. An input module wraps Unity's input system (or Rewired, or the new Input System) and exposes a contract that your game code consumes. A time module wraps `Time.deltaTime` and provides pausable, scalable game time. An audio module wraps FMOD or Wwise and exposes your game's audio vocabulary.

```csharp
// Without wrapping: scattered static calls, hard to test or swap
float delta = Time.deltaTime;
FMODUnity.RuntimeManager.PlayOneShot("event:/UI/Click");

// With wrapping: game code talks to contracts
float delta = _time.DeltaTime;  // IGameTime, pausable
_audio.Play(Sounds.UIClick);    // IAudio, uses your symbol vocabulary
```

This wrapping serves two purposes:

1. **Isolation.** If you change input systems, you change one module. The rest of the game talks to the contract, unchanged.
2. **Translation.** The wrapper translates engine-level concepts into game-level concepts. Raw input becomes "jump pressed." Raw time becomes "game time, paused during menus."

Most well-developed third-party packages fit cleanly into this architecture. They have clear entry points and defined APIs. You create a module that owns the integration, exposes a contract, and the rest of your code never knows what's underneath.

The goal is not to eliminate static access; it's to concentrate it. Static calls happen inside modules that own the relationship. Outside those modules, code talks to contracts.

## Persistence from day one

Almost every game needs to save state. If you treat persistence as an afterthought, you will find state scattered across MonoBehaviours, buried in scene hierarchies, tangled with runtime-only data. Retrofitting saving onto that is painful.

The modular architecture makes persistence natural. Hosts own their module's persistent state in plain data objects (simple fields, no Unity references, no circular graphs). A save module asks each host for serializable state, bundles it, writes it. Loading reverses the flow.

Players and platforms expect saving to be implicit: autosave on exit, cloud sync, seamless resume. If your architecture treats persistence as first-class from day one, these features are straightforward. If state is scattered, you will spend weeks hunting down what needs to be saved and how to restore it without breaking runtime assumptions.

Design for persistence early. It costs almost nothing if hosts already own state in plain objects. It costs months if you try to add it after state has leaked everywhere.

## ScriptableObjects as symbols (shared vocabulary)

As modules multiply, you need shared identity without shared code: stat names, damage types, item categories.

ScriptableObjects work well as **symbols**, assets that represent identity without being behavior. A ScriptableObject can represent a damage type, a stat name, an item category, without containing logic. Modules define vocabularies of these symbols. A host holds a serialized reference to a specific symbol, and that reference declares "I fill this role." Other modules can share the same symbol without ever communicating directly; they simply agree on identity through a shared asset reference.

Why not strings or enums? Strings break silently when you typo them. Enums force every consumer to recompile when you add a new value. ScriptableObject symbols are assets: you can rename them without breaking references, serialize them, inspect them, and query them at runtime. When a designer adds a new damage type, they create an asset. When a programmer needs to check if damage is "fire," they compare references. The vocabulary grows without the fragility.

This is lightweight, designer-friendly, and enables both domain coherence (the combat module defines its damage-type vocabulary) and operational abstraction (a generic "typed effect" system can work with any symbol vocabulary).

## Assembly definitions as enforcement

When you want the compiler to enforce boundaries, separate each module into its own assembly. Contracts go in a small shared assembly that everyone can reference. Each module references the contracts assembly but not other modules' internals. One orchestration assembly references everything and handles startup.

This makes the dependency graph explicit. Accidental coupling becomes a compile error. It also speeds up incremental builds, but that is a side benefit. The real purpose is architectural enforcement.

A typical layout:

- `Contracts.asmdef`: interfaces and data types that define module boundaries
- `Inventory.asmdef`: references Contracts only
- `Combat.asmdef`: references Contracts only
- `Orchestration.asmdef`: references everything, wires it together

When a junior developer tries to call into Combat's internals from Inventory, the compiler says no. That conversation happens at compile time, not during code review or after a bug ships. The architecture defends itself.

## Module granularity: when to split, when to merge

How do you know when a module is the right size? Module boundaries come from two sources: **domain coherence** and **operational abstraction**.

**Domain coherence** means the module corresponds to a slice of the game's meaning: inventory is about what the player has, combat is about damage and resolution, dialogue is about conversations. When a module's one-sentence description starts using "and," it probably contains two responsibilities.

**Operational abstraction** means the module's internal code stops caring what the data *means* and instead implements a pattern for how meaning is *created*. A stat system does not care that "Strength" is strength; it cares that there are named values that can be queried, modified, and observed. This separation is powerful because systems-level code becomes reusable across projects while domain-level code remains specific.

The same principle applies at every scale. What changes is how explicit and enforced the boundaries are. A two-week prototype might have informal modules with lightweight hosts. A two-year production might have strict assemblies, explicit contracts, and tooling to visualize dependencies. The mental model does not change; the rigor does.

## DI containers: help or hindrance?

Should you use Zenject or VContainer? You can. A DI container automates creation and resolution of dependencies, managing scopes for you. If your team is comfortable with it and uses it with discipline, it reduces boilerplate.

The danger is that containers make resolution so easy that developers stop thinking about dependency direction. A container that silently resolves anything from anywhere is a service locator with extra steps. If you use a container, configure it to enforce scoped lifetimes, init-only resolution, and contracts over implementations. Used well, it is a tool. Used carelessly, it obscures the architecture.

Some teams find that a lightweight hand-rolled locator (one static class that holds hosts during a scene's lifetime, populated at startup, cleared on unload) is enough. Others find that Zenject's installers and scopes match their mental model precisely. The choice is less important than the discipline: whatever system you use, it should enforce the same constraints (init-only resolution, scoped lifetimes, contracts over concrete types).

**If you are unsure where to start:** begin with a hand-rolled service locator. It is explicit, easy to debug, and teaches your team the constraints directly. Upgrade to Zenject or VContainer when you need child scopes, async installers, or factory patterns that the hand-rolled approach handles clumsily.

## Runtime debugging

Explicit architecture pays dividends in debugging. If hosts own state and expose contracts, you can build editor tools to inspect any host. You can log calls at boundaries. You can visualize module status.

Some teams build a debug panel listing all registered hosts with live data inspection. This is straightforward when state lives in plain objects owned by known hosts. It is nearly impossible when state is scattered across hundreds of MonoBehaviours.

You can also add contract-call tracing: every time a module accepts a command or answers a query, log it. When something goes wrong, you have a timeline of cross-module communication. This kind of visibility is very hard when dependencies are implicit and state is scattered.

## The journey, not the destination

Architecture is not something you install once and forget. It is a response to the project's current needs, applied incrementally. A prototype might have informal modules and direct references. A vertical slice might have lightweight hosts and manual registration. Production might have full assembly separation, explicit contracts, and init-only enforcement.

The principles stay the same:

- Coherent modules with single responsibilities.
- Clear boundaries and contracts.
- One owner for each piece of state.
- Explicit lifecycle and dependency resolution.

What changes is rigor. You add structure when structure earns its keep, when it solves a problem the team is actually feeling. You do not front-load ceremony for a project that might not survive the next milestone.

The payoff is a codebase that grows gracefully. New features slot into existing modules or become new modules with clear contracts. New team members find their footing faster. Debugging starts with "what did this module see?" rather than "what is everything connected to?" Prototyping and production feel like different points on a continuum, not different worlds.

If you take one thing from this article, take the membrane model: **everything participates by registering with a host; the host injects dependencies and owns what's inside; communication crosses the boundary through contracts.** That mental model forces hidden dependencies into visible relationships and gives you a foundation to grow on.

---

## Quick reference

For readers who have been here before:

**The core idea:**

> **The host is the module's membrane.** Everything participates by registering with a host. Registration injects dependencies. Communication crosses the membrane through contracts. The host owns what's inside.

**The shape:**

- **Modules** own coherent slices of functionality. One sentence per module.
- **Hosts** are the membrane; the entry point, state owner, and authority for each module.
- **Contracts** are the membrane's external surface. Other code talks to contracts, not internals.
- **Orchestration** creates hosts, controls lifetimes, wires contracts.

**Registration is the handshake:**

- Scene objects and spawned content **register with their host** during initialization.
- The host **injects dependencies** upon registration.
- After registration, components use stored references; **no runtime resolution**.

**Communication:**

- Host-to-host: through contracts (commands, queries, events).
- Spatial: through physics (triggers, raycasts, `GetComponent`). Components bridge to hosts.

**Ownership:**

- Every piece of state has one owner (a host).
- If two modules need to write the same field, the boundaries are wrong.

**Inside vs. outside:**

- Inside a module, do whatever works. The architecture governs boundaries, not internals.
- Contracts are the membrane. Respect them; internals are free.

**Multiplicity:**

- Design systems to operate on *a* thing, not *the* thing.
- Player ≠ avatar. Pass references; avoid singletons in reusable code.

**Enforcement escalation:**

- Solo: folders, conventions, social.
- Small team: named responsibilities, code review.
- Larger team: assembly definitions, compiler-enforced contracts.

**Persistence:**

- Hosts own state in plain data objects. Saving is asking each host for serializable state.

**Symbols:**

- ScriptableObjects as identity tokens. No strings, no enums. Assets you can rename without breaking references.

---

## Implementation: the starter kit

> **📋 DRAFT NOTICE:** This section will be expanded into a separate companion article: *"Unity Architecture Starter Kit: From Principles to Code."* That article will provide production-ready implementations of host-scenes, bootstrappers, the play-mode state machine, service locators, and the full host/component registration pattern described above.

To bootstrap this architecture, you need a small amount of infrastructure: a service locator, host base classes, a bootstrapper pattern, contract interfaces, and a folder structure that maps to eventual assembly separation.

The companion article will cover:

1. **Service locator**: a scoped container that holds host references for a scene's lifetime.
2. **Host base classes**: optional infrastructure for consistent initialization, registration, and shutdown.
3. **Bootstrapper pattern**: how the entry point of a host-scene initializes hosts, populates the locator, and triggers the play-mode FSM.
4. **Play-mode state machine**: the authoritative orchestrator for input routing, time scale, UI layers, and mode-wide concerns.
5. **Contract interfaces**: the narrow public surface that modules expose.
6. **Symbol pattern**: ScriptableObjects as designer-friendly identity tokens.
7. **Folder and assembly structure**: organizing code for eventual compiler-enforced boundaries.

For now, the principles in this article give you the mental model. The implementation details will follow, with working code you can adapt to your project.

**What you can do today:**

- Organize your project into module folders, even without assembly definitions.
- Create a single bootstrapper MonoBehaviour that initializes your hosts in order.
- Store dependencies during `Awake`/`Start` and never resolve them again at runtime.
- Define contracts as interfaces in a shared folder; have hosts implement them.
- Use ScriptableObjects as identity tokens instead of strings or enums.

These steps cost almost nothing and position you to adopt the full pattern when the companion article ships.
