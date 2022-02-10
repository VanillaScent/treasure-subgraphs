import * as questingLegacy from "../../generated/Questing Legacy/Questing";
import { Address, BigInt, log, store } from "@graphprotocol/graph-ts";
import { DIFFICULTY, getAddressId, getXpPerLevel } from "../helpers";
import { LEGION_ADDRESS, TREASURE_ADDRESS } from "@treasure/constants";
import { LegionInfo, Quest, Random, Reward } from "../../generated/schema";
import {
  QuestFinished,
  QuestRevealed,
  QuestStarted,
} from "../../generated/Questing/Questing";

function handleQuestStarted(
  address: Address,
  user: Address,
  tokenId: BigInt,
  requestId: BigInt,
  finishTime: BigInt,
  difficulty: i32
): void {
  let random = Random.load(requestId.toHexString());
  let quest = new Quest(getAddressId(address, tokenId));

  if (!random) {
    log.error("[quest-started] Unknown random: {}", [requestId.toString()]);

    return;
  }

  quest.difficulty = DIFFICULTY[difficulty];
  quest.endTimestamp = finishTime.times(BigInt.fromI32(1000));
  quest.token = getAddressId(LEGION_ADDRESS, tokenId);
  quest.random = random.id;
  quest.status = "Idle";
  quest.user = user.toHexString();

  random.quest = quest.id;
  random.requestId = requestId;

  quest.save();
  random.save();
}

export function handleQuestStartedWithDifficulty(event: QuestStarted): void {
  let params = event.params;

  handleQuestStarted(
    event.address,
    params._owner,
    params._tokenId,
    params._requestId,
    params._finishTime,
    params._difficulty
  );
}

export function handleQuestStartedWithoutDifficulty(
  event: questingLegacy.QuestStarted
): void {
  let params = event.params;

  handleQuestStarted(
    event.address,
    params._owner,
    params._tokenId,
    params._requestId,
    params._finishTime,
    0 // Easy difficulty
  );
}

export function handleQuestRevealed(event: QuestRevealed): void {
  let params = event.params;
  let result = params._reward;
  let tokenId = params._tokenId;
  let id = getAddressId(event.address, tokenId);

  let quest = Quest.load(id);

  if (!quest) {
    log.error("[revealed] Unknown quest: {}", [id]);

    return;
  }

  // Increase Xp
  let metadata = LegionInfo.load(`${quest.token}-metadata`);

  if (metadata && metadata.type != "Recruit" && metadata.questing != 6) {
    metadata.questingXp += getXpPerLevel(metadata.questing);
    metadata.save();
  }

  let reward = new Reward(`${id}-${quest.random}`);

  reward.crystalShards = result.crystalShardAmount;
  reward.starlights = result.starlightAmount;

  if (result.treasureId.gt(BigInt.zero())) {
    reward.treasure = getAddressId(TREASURE_ADDRESS, result.treasureId);
  }

  reward.universalLocks = result.universalLockAmount;

  reward.save();

  quest.reward = reward.id;
  quest.status = "Revealed";

  quest.save();
}

export function handleQuestFinished(event: QuestFinished): void {
  let id = getAddressId(event.address, event.params._tokenId);

  let quest = Quest.load(id);

  if (!quest) {
    log.error("[finished] Unknown quest: {}", [id]);

    return;
  }

  quest.id = `${quest.id}-${quest.random}`;
  quest.status = "Finished";
  quest.save();

  store.remove("Quest", id);
}
