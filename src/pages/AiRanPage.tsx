import { useMemo, useState } from 'react';
import { usePlatform } from '@/services/PlatformProvider';
import { DataFlowDiagram } from '@/components/DataFlowDiagram';
import { InfraStatusBadge } from '@/components/InfraStatusBadge';
import './AiRanPage.css';

type Scenario = 'local-edge' | 'cloud' | 'ai-ran';

interface ScenarioModel {
  id: Scenario;
  title: string;
  icon: string;
  processedAt: string;
  travel: string;
  analysis: string;
  feedbackPath: string;
  // Illustrative latency ranges (clearly conceptual, not measured).
  typicalLatency: string;
  scaling: string;
  measured: boolean;
}

const SCENARIOS: ScenarioModel[] = [
  {
    id: 'local-edge',
    title: 'Local Edge',
    icon: '🖥️',
    processedAt: 'In the browser / device next to the patient.',
    travel: 'Sensor → device → in-process analysis. No external hop.',
    analysis: 'Rule-based movement analysis runs on-device.',
    feedbackPath: 'Feedback appears immediately on the same device.',
    typicalLatency: 'Measured this session (see below)',
    scaling: 'One device per patient; no shared infrastructure needed.',
    measured: true,
  },
  {
    id: 'cloud',
    title: 'Cloud',
    icon: '☁️',
    processedAt: 'On a remote server, potentially far away.',
    travel: 'Sensor → device → internet → cloud → back again.',
    analysis: 'Model runs in a central data centre.',
    feedbackPath: 'Feedback returns after a full network round-trip.',
    typicalLatency: 'Higher & more variable (distance-dependent)',
    scaling: 'Centralised; scales with data-centre capacity but adds distance.',
    measured: false,
  },
  {
    id: 'ai-ran',
    title: 'AI-RAN Edge (conceptual)',
    icon: '📡',
    processedAt: 'On compute co-located with the 5G base station.',
    travel: 'Sensor → 5G radio → AI-RAN edge (one short hop).',
    analysis: 'Inference hosted on infrastructure shared with the RAN.',
    feedbackPath: 'Feedback returns over the same low-latency radio link.',
    typicalLatency: 'Potentially low — but NOT measured here',
    scaling: 'Could serve many patients from shared cellular-edge compute.',
    measured: false,
  },
];

/**
 * AI-RAN & Edge Intelligence dashboard. Explains AI-for/on/and-RAN and lets the
 * user compare local-edge, cloud and conceptual AI-RAN deployment scenarios.
 * Clearly separates MEASURED data (local edge, this session) from SIMULATED /
 * conceptual network scenarios.
 */
export function AiRanPage() {
  const { infrastructure, sensorMode, connectionState } = usePlatform();
  const [scenario, setScenario] = useState<Scenario>('local-edge');
  const active = useMemo(
    () => SCENARIOS.find((s) => s.id === scenario)!,
    [scenario]
  );
  const live = connectionState === 'connected';

  return (
    <div className="page airan">
      <div className="airan__hero">
        <h1>AI-RAN &amp; Edge Intelligence</h1>
        <p className="text-muted">
          How intelligent network and edge-processing technologies can support a
          connected rehabilitation system — and how this prototype maps onto
          them today.
        </p>
        <div className="row row--wrap">
          <InfraStatusBadge status={infrastructure} showNote />
        </div>
      </div>

      <section className="card">
        <h2>System data flow</h2>
        <p className="text-muted" style={{ marginTop: 0 }}>
          {live
            ? 'Live — data is flowing from the connected source through analysis to feedback.'
            : 'Connect a brace or Simulation to see live activity flow.'}
        </p>
        <DataFlowDiagram live={live} activeStage={live ? 2 : undefined} />
      </section>

      <h2 className="section-title">Three concepts</h2>
      <div className="airan__concepts">
        <ConceptCard
          icon="🛰️"
          title="AI for RAN"
          body="Artificial intelligence can optimise compatible cellular network resources, helping maintain consistent communication across many connected rehabilitation devices."
        />
        <ConceptCard
          icon="🧠"
          title="AI on RAN"
          body="AI inference can be hosted on infrastructure close to connected devices, so movement analysis happens nearer the user instead of always relying on a distant cloud."
        />
        <ConceptCard
          icon="🤝"
          title="AI and RAN"
          body="Compatible infrastructure can share computing resources between cellular-network operations and AI workloads."
        />
      </div>

      <h2 className="section-title">Compare deployment scenarios</h2>
      <div className="card">
        <div className="airan__tabs" role="tablist" aria-label="Deployment scenario">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={scenario === s.id}
              className={scenario === s.id ? 'is-active' : ''}
              onClick={() => setScenario(s.id)}
            >
              <span aria-hidden="true">{s.icon}</span> {s.title}
            </button>
          ))}
        </div>

        <div className="airan__scenario">
          {!active.measured && (
            <div className="airan__simtag">
              {active.id === 'ai-ran'
                ? 'Conceptual — AI-RAN is not actually connected. Figures are illustrative, not proven performance.'
                : 'Simulated network scenario — not measured on this device.'}
            </div>
          )}
          <dl>
            <Row k="Where data is processed" v={active.processedAt} />
            <Row k="How data travels" v={active.travel} />
            <Row k="What analysis occurs" v={active.analysis} />
            <Row k="How feedback reaches the patient" v={active.feedbackPath} />
            <Row k="Responsiveness" v={active.typicalLatency} />
            <Row k="Scaling to many patients" v={active.scaling} />
          </dl>
        </div>
      </div>

      <div className="card airan__note">
        <h3>What is real in this prototype?</h3>
        <ul>
          <li>
            <strong>Local Edge is real &amp; measured:</strong> the movement
            analyzer runs in your browser and its latency is timed live.
          </li>
          <li>
            <strong>Cloud is an interface + simulation:</strong> a real endpoint
            can be plugged in; without one, figures are clearly simulated.
          </li>
          <li>
            <strong>AI-RAN is conceptual:</strong> the architecture is designed
            so inference could later run on 5G AI-RAN edge infrastructure. This
            app does <em>not</em> use a real AI-RAN cellular network, and the
            "AI-RAN Edge" status only appears if such a backend is confirmed.
          </li>
        </ul>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Current source: <strong>{sensorMode}</strong> · This is a
          rehabilitation monitoring prototype, not a clinical or network
          performance benchmark.
        </p>
      </div>
    </div>
  );
}

function ConceptCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="concept-card card">
      <span className="concept-card__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="airan__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
