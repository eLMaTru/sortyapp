import { DrawContract, creditsToUSDC } from '@sortyapp/shared';

class EmailService {
  async sendDrawCompletionEmails(contract: DrawContract): Promise<void> {
    // In v0.1: mock email sending by logging to console.
    // In production: publish to SQS → Lambda consumer → SES
    const participantList = Object.values(contract.participantUsernames).join(', ');

    for (const userId of contract.participants) {
      const username = contract.participantUsernames[userId];
      const isWinner = userId === contract.winnerId;

      const emailContent = {
        to: `${username}@placeholder.com`, // In production: look up email from user record
        subject: isWinner
          ? `You won Draw #${contract.drawId.slice(0, 8)}!`
          : `Draw #${contract.drawId.slice(0, 8)} Result`,
        body: [
          `Hi ${username},`,
          '',
          isWinner
            ? `Congratulations! You were selected in Draw #${contract.drawId.slice(0, 8)}!`
            : `Draw #${contract.drawId.slice(0, 8)} has been completed.`,
          '',
          `Draw Details:`,
          `  - Draw ID: ${contract.drawId}`,
          `  - Participants: ${contract.totalSlots} (${participantList})`,
          `  - Entry: $${contract.entryCredits / 100}`,
          `  - Prize Pool: $${creditsToUSDC(contract.pool)}`,
          `  - Selected User: ${contract.winnerUsername}`,
          `  - Completed: ${contract.completedAt}`,
          '',
          `Verify fairness:`,
          `  - Commit Hash: ${contract.commitHash}`,
          `  - Public Seed: ${contract.publicSeed}`,
          `  - Server Seed: ${contract.revealedServerSeed}`,
          '',
          `View details: https://sortyapp.com/rooms/${contract.drawId}`,
        ].join('\n'),
      };

      console.log(`[EMAIL] Would send to ${emailContent.to}:`);
      console.log(`  Subject: ${emailContent.subject}`);
      console.log(`  ${emailContent.body.split('\n')[2]}`);
    }
  }
}

export const emailService = new EmailService();
