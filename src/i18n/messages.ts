import { TextHelpers } from '../client/helpers';

export const messages = {
  COOLDOWN: 'Please wait **{0}** before using the {1} command again.',
  USAGE: "You're missing the **{0}** argument! \nUsage: {1}",
  COMMAND_FEEDBACK_SERVER_ONLY:
    'The {0} command is unavailable via private message. Please run it in a server.',
  COMMAND_FEEDBACK_DM_ONLY:
    'The {0} command is only available via private message. Please run it in the DMs.',
  COMMAND_FEEDBACK_MISSING_PERMISSION: TextHelpers.lines(
    'You do not have permission to use this command.',
    `Your permission level is {0} ({1})`,
    `This command requires level {2} ({3})`,
  ),
  COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR: TextHelpers.lines(
    `Looks like you have a problem with your args.`,
    '{0}',
  ),
  COMMAND_FEEDBACK_MISSING_ARGS_PLURAL: TextHelpers.lines(
    `Looks like you have a few problems with your args.`,
    '{0}',
  ),
  COMMAND_FEEDBACK_NSFW_ONLY: 'This command can only be used in NSFW channels.',
};
