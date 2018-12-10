import { Injectable } from '@angular/core';
import { interval } from 'rxjs';
import { Store } from '@ngxs/store';

import { SubmissionArchive } from '../../models/postybirb-submission-model';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { SubmissionStatus } from '../../enums/submission-status.enum';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {

  private submissions: SubmissionArchive[] = [];

  constructor(private _store: Store) {
    _store.select(state => state.postybirb.submissions).subscribe((queued: SubmissionArchive[]) => {
      this.submissions = (queued || []).filter(archive => archive.meta.schedule).sort((a, b) => {
        const aDate = new Date(a.meta.schedule);
        const bDate = new Date(b.meta.schedule);

        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
        return 0;
      });
    });

    if (immediatelyCheckForScheduled) {
      setTimeout(this.checkForScheduled.bind(this), 6500); // wait some time to let websites load
    } else {
      interval(60000).subscribe(() => {
        this.checkForScheduled();
      });
    }
  }

  private checkForScheduled(): void {
    const now = new Date();
    const available = this.submissions
      .filter(s => s.meta.schedule) // if scheduled
      .filter(s => new Date(s.meta.schedule) <= now); // if time to post

    for (let i = 0; i < available.length; i++) {
      const submission = available[i];
      switch (submission.meta.submissionStatus) {
        case SubmissionStatus.QUEUED:
          break;
        case SubmissionStatus.POSTING:
          break;
        default:
          this._store.dispatch(new PostyBirbStateAction.QueueSubmission(submission));
      }
    }
  }
}
