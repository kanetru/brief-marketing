import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { VOICE_ROUNDS } from "../domain/voice";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function VoiceScreen() {
  const { session, chooseVoice, setVoiceLanguage } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("voice");
  const round = step > 0 && step <= VOICE_ROUNDS.length ? session.voicePreferences.comparisons[step - 1] : undefined;
  const languageStep = step - VOICE_ROUNDS.length;

  return (
    <DiscoveryLayout
      section="voice"
      step={step}
      width="narrow"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "voice", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`voice-${step}`}>
        {step === 0 ? (
          <QuestionScreen
            kicker="Voice"
            title="Now, how should you sound?"
            supporting="Forget tone-of-voice charts for a second. Which of these actually sounds like something you'd be comfortable saying?"
          />
        ) : null}
        {round ? (
          <QuestionScreen kicker="Voice" title={round.situation} supporting="Same idea. Different ways of saying it.">
            <div className="voice-stack" role="group" aria-labelledby="question-title">
              {round.options.map((option) => {
                const pressed = round.choice.state === "selected" && round.choice.optionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={pressed ? "voice-option is-pressed" : "voice-option"}
                    aria-pressed={pressed}
                    onClick={() => chooseVoice(round.roundId, option.id)}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
            <div className="quiet-row">
              <QuietChoice
                label="None of these"
                pressed={round.choice.state === "none"}
                onClick={() => chooseVoice(round.roundId, "none")}
              />
            </div>
          </QuestionScreen>
        ) : null}
        {languageStep === 1 ? (
          <QuestionScreen
            kicker="Voice"
            title="Are there words or phrases that feel particularly like you?"
            supporting="Things you naturally say, expressions your customers know you for, or language you want us to keep."
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              value={textValue(session.voicePreferences.preferredLanguage)}
              placeholder="Leave this open if nothing comes to mind"
              onChange={(value) => setVoiceLanguage("preferred", value)}
            />
          </QuestionScreen>
        ) : null}
        {languageStep === 2 ? (
          <QuestionScreen
            kicker="Voice"
            title="Anything you never want us to sound like?"
            supporting="Corporate jargon, hard-sell language, or anything else that would feel wrong in your mouth."
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              value={textValue(session.voicePreferences.avoidedLanguage)}
              placeholder="Leave this open if nothing comes to mind"
              onChange={(value) => setVoiceLanguage("avoided", value)}
            />
          </QuestionScreen>
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}
