"use client";

import { useEffect, useRef } from "react";
import { createSquirrelThreeScene } from "@/catalog/eastern-gray-squirrel/SquirrelThreeScene";
import styles from "@/app/page.module.css";

export function SquirrelModelStage({ modelUrl }: { modelUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = createSquirrelThreeScene({ host, modelUrl });
    return () => scene.dispose();
  }, [modelUrl]);

  return (
    <div className={styles.squirrelModelStage}>
      <div ref={hostRef} className={styles.squirrelModelCanvas} />
    </div>
  );
}
