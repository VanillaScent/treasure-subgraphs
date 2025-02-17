import { AnswerUpdated } from "../../generated/ChainlinkAggregator/ChainlinkAggregator";
import { getOrCreateGlobal } from "../utils";

export function handleETHUSDUpdated(event: AnswerUpdated): void {
  const params = event.params;
  const global = getOrCreateGlobal();

  global.ethPrice = params.current;
  global.updatedAt = event.block.timestamp;
  global.save();
}
