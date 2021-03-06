import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { Observable } from 'rxjs';
import { HTMLParser } from '../../helpers/html-parser';

@Injectable()
export class DeviantArt extends BaseWebsite implements Website {
  private folders: any[] = [];

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.DeviantArt, 'https://www.deviantart.com', 'deviantart');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 2,
        Extreme: 2,
      },
      content: {
        Artwork: 'digitalart/paintings/other',
        Story: 'literature/prose/fiction/general/shortstory',
        Music: 0,
        Animation: 'flash/animations',
      }
    };

    this.coordinator.insertService(this.websiteName, this, 4 * 60000);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      if (this.helper.isAuthorized()) {
        if (this.folders.length === 0) {
          this.folders = this.helper.getUserFolders().then((folders) => {
            this.folders = folders;
          });
        }
        this.loginStatus = WebsiteStatus.Logged_In;
      } else this.loginStatus = WebsiteStatus.Logged_Out;

      resolve(this.loginStatus);
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      const userInfo = this.helper.getUserInfo();
      userInfo && userInfo.username ? resolve(userInfo.username) : reject(null);
    });
  }

  getInfo(): any {
    return { folders: this.folders };
  }

  unauthorize(): any {
    super.unauthorize();
    this.http.get(`${this.baseURL}`, { responseType: 'text' }).subscribe((page) => {
      const body = new URLSearchParams();
      body.set('validate_token', HTMLParser.getInputValue(page, 'validate_token'));
      body.set('validate_key', HTMLParser.getInputValue(page, 'validate_key'))
      this.http.post(`${this.baseURL}/users/logout`, body.toString(), { headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded') }).subscribe(() => { });
    });
  }

  public checkAuthorized(): Promise<boolean> {
    return this.helper.refresh();
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      if (!this.helper.isAuthorized()) {
        observer.error(this.createError(null, null, 'Not Authorized'));
        observer.complete();
      } else {
        // Form to be submit to sta.sh
        const stashForm = new FormData();

        stashForm.set('title', submission.submissionData.title);
        stashForm.set('access_token', this.helper.getAuthorizationToken());
        stashForm.set('file', submission.submissionData.submissionFile.getRealFile());
        stashForm.set('artist_comments', submission.description);


        // Handle setting tags
        const tags = this.formatTags(submission.defaultTags, submission.customTags);
        for (let i = 0; i < tags.length; i++) {
          stashForm.set(`tags[${i}]`, tags[i]);
        }

        this.http.post(`${this.baseURL}/api/v1/oauth2/stash/submit`, stashForm)
          .subscribe((res: any) => {
            const options = submission.options;

            if (options.stashOnly) {
              observer.next(true);
              observer.complete();
            } else {
              if (typeof res === 'string') {
                res = JSON.parse(res);
              }

              // Form data for submitting sta.sh to deviantart
              const submitForm = new FormData();

              const rating = this.getMapping('rating', submission.submissionData.submissionRating)
              const type = this.getMapping('content', submission.submissionData.submissionType);

              submitForm.set('access_token', this.helper.getAuthorizationToken());
              submitForm.set('itemid', res.itemid);
              submitForm.set('agree_tos', '1');
              submitForm.set('agree_submission', '1');
              submitForm.set('is_mature', (rating !== this.getMapping('rating', 'General')).toString());
              if (rating !== this.getMapping('rating', 'General')) {
                submitForm.set('mature_level', 'moderate');
              }

              if (type) submitForm.set('catpath', type);

              // Extra Options
              if (options.matureClassification.length > 0) {
                for (let i = 0; i < options.matureClassification.length; i++) {
                  const opt = options.matureClassification[i];
                  submitForm.set(`mature_classification[${i}]`, opt);
                }
              }
              if (options.matureLevel) submitForm.set('mature_level', options.matureLevel);
              if (options.category) submitForm.set('catpath', options.category);
              if (options.disableComments) submitForm.set('allow_comments', 'false');
              if (options.critique) submitForm.set('request_critique', 'true');
              if (options.freeDownload) submitForm.set('allow_free_download', 'false');
              if (options.feature) submitForm.set('feature', 'true');
              if ((options.folders || []).length > 0) {
                if (options.category && options.category.includes('scraps')) {
                  // skip folders when set to scraps
                } else {
                  for (let i = 0; i < options.folders.length; i++) {
                    submitForm.set(`galleryids[${i}]`, options.folders[i]);
                  }
                }
              }

              this.http.post(`${this.baseURL}/api/v1/oauth2/stash/publish`, submitForm)
                .subscribe(() => {
                  observer.next(true);
                  observer.complete();
                }, err => {
                  observer.error(this.createError(err, submission, (err.error || {}).error_description));
                  observer.complete();
                });
            }
          }, err => {
            observer.error(this.createError(err, submission));
            observer.complete();
          });
      }
    });
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      const journalData = new FormData();
      journalData.set('body', data.description);
      journalData.set('access_token', this.helper.getAuthorizationToken());

      this.http.post(`${this.baseURL}/api/v1/oauth2/user/statuses/post`, journalData)
        .subscribe(() => {
          observer.next(true);
          observer.complete();
        }, err => {
          observer.error(this.createError(err, data));
          observer.complete();
        });
    });
  }
}
