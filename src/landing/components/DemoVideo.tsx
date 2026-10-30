import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../../analytics/gtag";
import { PlayIcon } from "../../components/icons/UiIcons";
import { DURATION_LABEL, POSTER_SRC, VIDEO_SRC } from "../demoVideo";
import "./DemoVideo.css";

export function DemoVideo() {
  const { t } = useTranslation("landing");
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    trackEvent("demo_play");
    void video.current?.play();
  }

  return (
    <section id="demo" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("demo.label")}</span>
          <h2 className="landing-section-title">{t("demo.title")}</h2>
          <p className="demo-video-lead">{t("demo.lead")}</p>
        </div>

        <div className="demo-video-frame landing-card" data-reveal="1">
          <video
            ref={video}
            className="demo-video"
            poster={POSTER_SRC}
            preload="none"
            playsInline
            controls={started}
            aria-label={t("demo.video")}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          {started ? null : (
            <button type="button" className="demo-video-play" onClick={play}>
              <span className="demo-video-play-pill">
                <span className="demo-video-play-icon">
                  <PlayIcon width={18} height={18} />
                </span>
                <span className="demo-video-play-label">{t("actions.watchDemo")}</span>
                <span className="demo-video-play-time">{DURATION_LABEL}</span>
              </span>
            </button>
          )}
        </div>
        <p className="demo-video-note">{t("demo.note")}</p>
      </div>
    </section>
  );
}
