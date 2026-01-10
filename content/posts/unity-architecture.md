# Unity Architecture for Growing Projects

<!--
## Planning Notes

**Premise:** Unity's design (content-driven instantiation, lifecycle callbacks, serialized references) is not a mistake. It enables fast iteration and designer-friendly workflows. But it creates implicit coupling that becomes painful at scale. This article explains an architecture that works *with* Unity's grain while adding the structure needed for teams and persistence.

**What this covers:**
- The target architecture (modules, hosts, contracts, orchestration)
- Why this is not OOP architecture; hosts are like ECS systems, the pattern is engine-agnostic
- What helps solo developers vs. what to skip; how dynamics change as teams grow
- Why Unity's instantiation model requires a specific compromise (self-registration + init-only resolution)
- The single constraint that prevents architectural collapse
- How to handle: lifecycle, data ownership, cross-cutting concerns, persistence, shared vocabulary
- The physical world as a communication channel (triggers, raycasts, spatial queries)
- Premature abstraction as the root of all evil; start concrete, abstract when earned
- What happens inside a module (freedom to solve problems however you like)
- The singleton trap: designing for multiplicity (shells, mode changes, when to throw out prototypes)
- Third-party code and static APIs; wrapping, not rejecting
- Enforcement mechanisms (assembly definitions, DI containers)
- When and how to formalize (escalation is implicit context, not structure)

**What this does NOT cover:**
- Code examples (appendix, later)
- Specific DI framework tutorials
- ECS/DOTS as a paradigm (though we note the conceptual parallels)

**Reader:** Someone who has shipped a small Unity project and is now working on something larger, or leading a team. They need to understand *why* the constraints exist, not just *what* to do.
-->

## Premise

Unity does not make you write spaghetti. Unity makes spaghetti easy to start and painful to unwind.

The engine's design (scenes, prefabs, `GetComponent`, serialized references, lifecycle callbacks) prioritizes iteration speed and designer access. That's not a flaw. It's why prototyping in Unity feels fast. But those same features create implicit coupling: any object can find any other object, callbacks run in engine-determined order, and state scatters across the hierarchy.

This article describes an architecture that works *with* Unity's grain: it keeps editor-friendly workflows and content-driven instantiation while adding explicit structure for ownership, lifecycle, and dependencies. The architecture scales from prototype to production by changing *rigor*, not *model*. The same mental framework applies at every stage; what changes is how strictly you enforce it.

The goal is a codebase where:

- New team members can learn one module at a time.
- Persistence is straightforward because state has clear owners.
- Debugging starts with "what did this module see?" not "what is everything connected to?"
- Prototyping and production feel like points on a continuum, not different worlds.

### This is not OOP architecture

This architecture uses objects because C# and Unity use objects. But the pattern itself is not object-oriented in the design-patterns sense. Hosts are analogous to ECS systems: long-lived processes that own state and run logic. Components inside a module can be plain data structures (like ECS components) or bridges to the view layer (which ECS also needs). The orchestration layer is a composition root, a concept that exists in any paradigm.

The same architecture applies to Unreal, Godot, or a custom engine. The specifics change (Unreal has Subsystems, Godot has Autoloads), but the principles are the same: coherent modules, explicit boundaries, clear ownership, controlled lifecycle. What you see here caters to Unity's particulars, but the mental model travels.

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

The architecture is a direction, not a destination. Solo projects can travel light. Its worth considering however, that as your solo project grows, you may have to look at yourself as a different developer if you can't keep all details in your head anymore. Then this architecture helps your protect you from yourself.

Also, one certain modules mature and turn into reusable libraries that are portable between projects that are all built with this mindset, you can prototype quickly while using production ready infrastructure for the generic bits.

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

To understand why these constraints matter, picture a large Unity project as a city. The problem in most Unity cities is that any building can build a private road to any other building. At first it feels efficient. Later you discover you cannot reason about traffic, you cannot reroute, and you cannot tell which roads are essential and which are accidental.

Architecture is deciding where the districts are, what roads are allowed to cross districts, and where the entry points are. You are not trying to eliminate roads; you are trying to make the road network legible.

A "module" is one district. Inventory is a district. Combat is a district. Dialogue is a district. Save/load is a district. UI shell is a district. The exact partitioning is less important than the fact that you commit to one and keep it stable. Each district must be coherent: most of what it does should be explainable with one sentence.

### What changes from prototype to production

The model stays the same; what changes is how explicit and enforced it is:

| Stage          | Modules                | Hosts                   | Contracts                  | Enforcement |
| -------------- | ---------------------- | ----------------------- | -------------------------- | ----------- |
| Prototype      | Folders, conventions   | MonoBehaviours          | Implicit (public methods)  | Social      |
| Vertical slice | Named responsibilities | Own state as plain data | Deliberate interfaces      | Code review |
| Production     | Assembly-separated     | Formal lifecycle        | Shared assembly            | Compiler    |

---

## Unity's instantiation reality (and the compromise that works)

Unity instantiates things from content: scenes, prefabs, additive loading, Addressables. If you insist that a central orchestrator must explicitly construct every gameplay object, you end up writing spawners for everything and fighting iteration.

The compromise that scales is:

- The orchestration layer creates or loads **hosts** and establishes **scopes** to which they bind.
- Unity-instantiated components **self-register** with the appropriate host during initialization.
- After registration, the host injects them with dependencies and the components never again look-up dependencies on their own.

This keeps workflows editor-friendly while still making ownership and boundaries explicit.

## The one constraint that prevents architectural collapse

Service location isn't inherently evil; *unscoped, always-available resolution* is.

The safe rule is:

> Scene objects may resolve contracts **only during initialization**, store them, and **never resolve again**.

That single constraint blocks the worst failure mode: runtime dependency fishing. If scripts can call `Resolve<T>()` in `Update`, people stop designing APIs and coupling becomes invisible again, just hidden behind a nicer global hook.

## Dependencies should always be ready

What if a dependency isn't ready yet? In this model, it should be.

The orchestration layer's job is to ensure that by the time anything initializes, the hosts it depends on already exist and are ready. This is a design constraint that serves games well: predictable memory, predictable timing, fewer frame spikes.

If something truly must load asynchronously, orchestration should await it *before* allowing dependents to initialize. Avoid architectures where "asking for a thing" silently constructs it. This only causes surprises when such requests begin to cascade. It complicates reasoning about lifecycle and makes dependencies brittle.

## Explicit lifecycle beats superstition

Many Unity projects don't fail because Unity has callbacks; they fail because callbacks become an implicit scheduler.

Hosts make lifecycle explicit:

- `Awake`/`OnEnable` is for registration and capturing dependencies.
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

## The physical world as communication

There is another communication channel that does not flow through hosts or contracts: the physical world itself.

When a projectile hits an enemy, when a player enters a trigger volume, when a raycast finds a target; these are spatial queries that Unity handles efficiently and that designers can set up without code. The physics engine is a built-in spatial index with tool support, collision layers, and predictable performance. Most games should use it.

This creates a hybrid communication pattern:

- **Discovery happens through physics.** A trigger detects that something entered. A raycast finds what the player is looking at. An overlap query finds all enemies in range.
- **Communication happens through components.** The discovered object exposes a component (via `GetComponent` or an interface) that the discoverer can talk to. The projectile finds an `IDamageable` on the hit object and calls `TakeDamage`.

This pattern is powerful because it decouples *what* can interact from *where* interactions are defined. A door trigger doesn't need to know about the player module. It detects colliders on the "Interactor" layer and calls `IInteractor.Interact()` on whatever it finds. The player, an AI companion, or a vehicle can all trigger the door, as long as they implement the interface.

### How this fits the architecture

The physical world is not a replacement for host-to-host communication through contracts. It is a *supplement* for spatial relationships:

- **Host contracts** handle module-to-module communication: "inventory, do I have ammo?" "combat, apply this damage." These are direct, typed, and independent of position.
- **Physics queries** handle spatial questions: "what is near this point?" "what did this raycast hit?" "what entered this volume?" The answer is a GameObject, and from there you query for components.

The components you find through physics can be bridges to hosts. An `IDamageable` component on an enemy might delegate to the combat host: `combatHost.ApplyDamage(this.entity, damage)`. The component is the spatial markup; the host owns the logic.

### MonoBehaviours as spatial markup

Even if you move most logic out of MonoBehaviours and into hosts, MonoBehaviours remain essential for spatial games. They are Unity's way of attaching data and behavior to GameObjects in the scene. For physics-based communication, you need:

- **Trigger volumes** with MonoBehaviours that respond to `OnTriggerEnter/Exit`.
- **Collider components** that can be queried via raycast or overlap.
- **Interface implementations** (`IDamageable`, `IInteractor`, `IPickupable`) that physics queries can discover.

These MonoBehaviours are often thin, they hold a reference to their owning entity or host, implement a discovery interface, and delegate actual work elsewhere. But they must exist because Unity's physics system operates on GameObjects and components.

Think of these as "spatial contracts": lightweight components that let the physics world discover and communicate with your architecture. The component says "I am damageable"; the host decides what damage means.

## Data ownership

When two parts of the game care about the same data, pick an owner.

If both combat and UI need health, one module owns the canonical health value. Combat issues commands (apply damage). UI observes changes. Shared mutable state accessed from everywhere is how coupling sneaks back in.

If two modules both need to write the same field, your boundaries are wrong, or you need a third module to own that field.

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

Note: this is an escalation, not a foundational requirement. Early on, Unity's content-driven instantiation is fine; prefabs spawn, self-register, and participate in the architecture. As the project grows and you need enumeration, persistence, or pooling, you formalize spawners. The self-registration pattern from earlier still applies; spawners just become the hosts that registrants report to.

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

Logging, input, time and analytics are services many modules use but that do not belong inside any domain module. Treat them as **infrastructure contracts**: interfaces that the orchestration layer provides. Input translates raw Unity input into game-meaningful actions. *Time* provides pausable, scalable game time. *Logging_* and *Analytics* accept calls without modules knowing how data is stored or sent.

These contracts live in a shared assembly. The orchestration layer binds them to implementations at startup. Cross-cutting concerns become explicit dependencies, not invisible singletons.

The benefit is testability and swappability. When you want to record a replay, you swap the input contract for a playback implementation. When you want to fast-forward time in a test, you swap the time contract. When you ship to a platform without analytics, you swap for a no-op. None of this requires touching the modules that consume the contracts.

## Third-party code and static APIs

Unity's own APIs are full of static access: `Time.deltaTime`, `Input.GetKey`, `Physics.Raycast`. Third-party assets often use singletons. This is not a problem to fight; it's a reality to work with.

Static APIs and singletons are often a necessary constraint in games. They provide global access to things that are genuinely global: the physics engine, the render pipeline, platform services. We do not reject them. We do work to respect what makes them valuable (simplicity, predictability, single source of truth) while protecting them from abuse.

The pattern: wrap external singletons in modules that adapt them to your contracts. An input module wraps Unity's input system (or Rewired, or the new Input System) and exposes a contract that your game code consumes. A time module wraps `Time.deltaTime` and provides pausable, scalable game time. An audio module wraps FMOD or Wwise and exposes your game's audio vocabulary.

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

If you implement only one constraint from this entire article, implement this: scene objects may resolve contracts only during initialization, store them, and never resolve again. That single rule forces hidden dependencies into visible fields. From there, the rest of the architecture has a chance to grow with you.

---

## Quick reference

For readers who have been here before:

**The shape:**

- **Modules** own coherent slices of functionality. One sentence per module.
- **Hosts** are the entry point and state owner for each module.
- **Contracts** are the narrow public interface. Other code talks to contracts, not internals.
- **Orchestration** creates hosts, controls lifetimes, wires contracts.

**The one rule:**

> Resolve contracts only during initialization, store them, never resolve again.

**Communication:**

- Host-to-host: through contracts (commands, queries, events).
- Spatial: through physics (triggers, raycasts, `GetComponent`). Components bridge to hosts.

**Ownership:**

- Every piece of state has one owner.
- If two modules need to write the same field, the boundaries are wrong.

**Multiplicity:**

- Design systems to operate on *a* thing, not *the* thing.
- Player ≠ avatar. Pass references; avoid singletons in reusable code.
- Project-specific scripts can assume singletons. Reusable systems cannot.

**Abstraction:**

- Start concrete. Abstract when you see the compression.
- Inside a module, do whatever works. The architecture governs boundaries, not internals.

**Enforcement escalation:**

- Solo: folders, conventions, social.
- Small team: named responsibilities, code review.
- Larger team: assembly definitions, compiler-enforced contracts.

**What to wrap:**

- Third-party singletons and Unity statics go inside modules that expose contracts.
- Concentrate static access; don't scatter it.

**Persistence:**

- Hosts own state in plain data objects. Saving is asking each host for serializable state.

**Symbols:**

- ScriptableObjects as identity tokens. No strings, no enums. Assets you can rename without breaking references.

---

## Getting started: what to build first

To bootstrap this architecture, you need a small amount of infrastructure. None of it is complex; most of it fits in a few files. Here is a minimal starter kit (treat this as pseudo-code, even a minimal set will need to be more complex):

### 1. A service locator

A simple static class that holds references to hosts during a scope's lifetime (typically a scene or game session). This is the lightest possible "container."

```csharp
public static class Services
{
    private static readonly Dictionary<Type, object> _services = new();

    public static void Register<T>(T service) where T : class
    {
        _services[typeof(T)] = service;
    }

    public static T Get<T>() where T : class
    {
        return _services.TryGetValue(typeof(T), out var service)
            ? (T)service
            : throw new InvalidOperationException($"Service {typeof(T).Name} not registered.");
    }

    public static bool TryGet<T>(out T service) where T : class
    {
        if (_services.TryGetValue(typeof(T), out var obj))
        {
            service = (T)obj;
            return true;
        }
        service = null;
        return false;
    }

    public static void Clear()
    {
        _services.Clear();
    }
}
```

Call `Services.Clear()` when unloading a scene or ending a session. Register by contract type, not concrete type: `Services.Register<IInventory>(inventoryHost)`.

### 2. A host base class (optional)

If you want hosts to follow a consistent pattern, define a base class or interface. This is optional; some teams prefer explicit conventions over inheritance.

```csharp
public interface IHost<THost, TComponent> : IHost
{
    void Register(TComponent component);
    void UnRegister(TComponent component);
}

public interface IHost {
  void Initialize();
  void Shutdown();
}

public abstract class HostBase : MonoBehaviour {
  public abstract void Initialize();
  public abstract void Shutdown();
}

public abstract class ComponentHostBase<THost, TComponent> : HostBase, IHost<THost, TComponent>
{
    private HashSet<TComponent> _components = new();

    public IReadOnlySet<TComponent> Components => _components;

    public void Register(TComponent component) {
      _components.Add(component);
      OnRegistered();
    }
    public void UnRegister(TComponent component) {
      _components.Remove(component);
      OnUnRegistered();
    }

    protected virtual void Update() {
      foreach(var component in _components) {
        component.Tick(deltaTime);
      }
    }

    protected abstract void OnRegistered(TComponent component);
    protected abstract void OnUnregistered(TComponent component);
}

public abstract class ComponentBase<THost, TComponent> : MonoBehaviour {
    IHost<THost, TComponent> _system;

    protected void Start() {
      _system = Services.Get<IHost<THost, TComponent>>();
      _system.Register(this);
    }
    protected void Destroy() {
      if (_system) {
        _system.UNRegister(this);
      }
   }

   public abstract void Tick(float deltaTime);
}
```

Hosts that need MonoBehaviour (for coroutines, scene presence, inspector configuration) inherit from `HostBehaviour`. Hosts that are pure C# implement `IHost` directly or skip the interface entirely.

### 3. A bootstrapper

A single MonoBehaviour that runs at scene start, creates or finds hosts, initializes them in order, and registers their contracts with the service locator.

```csharp
public class SceneBootstrapper : MonoBehaviour
{
    [SerializeField] private HostBase[] _hosts;

    private void Awake()
    {
        // Clear previous scope
        Services.Clear();

        // Initialize hosts in order
        foreach (var host in _hosts)
        {
            host.Initialize();
        }

        // Register contracts (example)
        //
        // Services.Register<IInventory>(FindHost<InventoryHost>());
        // Services.Register<ICombat>(FindHost<CombatHost>());
        //
        // [SerializeField] InventoryHost inventory;
        // [SerializeField] CombatHost combat;
        // Services.Register<IInventory>(inventory);
        // Services.Register<ICombat>(combat);

    }

    private void OnDestroy()
    {
        // Shutdown in reverse order
        for (int i = _hosts.Length - 1; i >= 0; i--)
        {
            _hosts[i].Shutdown();
        }
        Services.Clear();
    }

    private T FindHost<T>() where T : HostBehaviour
    {
        foreach (var host in _hosts)
        {
            if (host is T typed) return typed;
        }
        return null;
    }
}
```

Drag hosts into the array in the inspector, ordered by initialization dependency. The bootstrapper becomes your composition root.

### 4. Contract interfaces

Define contracts for each module. Start minimal; expand as needed.

```csharp
// In Contracts assembly or folder
public interface IInventory
{
    bool HasItem(ItemSymbol item);
    int GetCount(ItemSymbol item);
    bool TryAdd(ItemSymbol item, int count);
    bool TryRemove(ItemSymbol item, int count);
    event Action<ItemSymbol, int> OnItemChanged;
}

public interface ICombat
{
    void ApplyDamage(IDamageable target, DamageInfo damage);
}

public interface IDamageable
{
    void TakeDamage(DamageInfo damage);
}
```

Contracts are the public surface. Hosts implement them; consumers depend on them.

### 5. A symbol base class

For ScriptableObject-based identity tokens:

```csharp
public abstract class Symbol : ScriptableObject
{
    // Symbols are compared by reference, not value.
    // Add display name, icon, or metadata as needed.
}

// Concrete symbol types
[CreateAssetMenu(menuName = "Symbols/Item")]
public class ItemSymbol : Symbol { }

[CreateAssetMenu(menuName = "Symbols/DamageType")]
public class DamageTypeSymbol : Symbol { }
```

Create assets in the project. Reference them in hosts and data. Compare with `==`.

### 6. Folder structure

A starting point:

```text
Assets/
  _Bootstrap/
    SceneBootstrapper.cs
    Services.cs
  Contracts/
    IInventory.cs
    ICombat.cs
    IDamageable.cs
  Modules/
    Inventory/
      InventoryHost.cs
      InventoryData.cs
    Combat/
      CombatHost.cs
      DamageInfo.cs
  Symbols/
    Symbol.cs
    ItemSymbol.cs
    DamageTypeSymbol.cs
  Content/
    Symbols/
      Items/
      DamageTypes/
```

When you are ready for compiler enforcement, convert `Contracts/` and each module folder into assembly definitions.

### What this gives you

With these pieces in place:

- Hosts initialize in a controlled order.
- Contracts are resolved once during initialization and stored.
- The service locator is scoped to the scene and cleared on unload.
- Symbols provide shared vocabulary without coupling modules.
- The folder structure maps to eventual assembly separation.

This is enough to start. Add rigor (assembly definitions, formal lifecycle phases, DI container) when the project demands it.
