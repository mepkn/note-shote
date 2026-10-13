import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Deletes notes that have been in the trash for more than TRASH_DAYS.
crons.cron("purge trash", "17 3 * * *", internal.notes.purgeTrash, {});

export default crons;
