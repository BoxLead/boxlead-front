import { useRef, useState } from "react";
import { PlayIcon } from "../../components/icons/UiIcons";
import "./DemoVideo.css";

const VIDEO_SRC = "/demo/boxlead-demo.mp4";
const POSTER_SRC = "/demo/boxlead-demo-poster.jpg";
const DURATION_LABEL = "2:27";

export function DemoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    void video.current?.play();
  }

  return (
    <section id="demo" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">Demo</span>
          <h2 className="landing-section-title">Mirá a BoxLead en acción</h2>
          <p className="demo-video-lead">
            Tus agentes respondiendo, ordenando cada lead y mostrándote qué rinde.
          </p>
        </div>

        <div className="demo-video-frame landing-card" data-reveal="1">
          <video
            ref={video}
            className="demo-video"
            poster={POSTER_SRC}
            preload="none"
            playsInline
            controls={started}
            aria-label="Demo de BoxLead"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          {started ? null : (
            <button type="button" className="demo-video-play" onClick={play}>
              <span className="demo-video-play-pill">
                <span className="demo-video-play-icon">
                  <PlayIcon width={18} height={18} />
                </span>
                <span className="demo-video-play-label">Ver la demo</span>
                <span className="demo-video-play-time">{DURATION_LABEL}</span>
              </span>
            </button>
          )}
        </div>
        <p className="demo-video-note">Grabada con datos de ejemplo.</p>
      </div>
    </section>
  );
}
