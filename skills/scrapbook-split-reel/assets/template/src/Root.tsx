import { CalculateMetadataFunction, Composition } from "remotion";
import plan from "./plan.json";
import { Reel } from "./reel/Reel";
import { FPS } from "./reel/tokens";
import { Plan } from "./reel/types";

type Props = { plan: Plan };

const calculateMetadata: CalculateMetadataFunction<Props> = ({ props }) => ({
  durationInFrames: Math.ceil(props.plan.duration * FPS),
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={300}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ plan: plan as Plan }}
    calculateMetadata={calculateMetadata}
  />
);
