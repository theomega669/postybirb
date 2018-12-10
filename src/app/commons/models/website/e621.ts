import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class E621 extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.e621, 'https://e621.net');
    this.mapping = {
      rating: {
        General: 'safe',
        Mature: 'questionable',
        Explicit: 'explicit',
        Extreme: 'explicit'
      },
      content: {
        Artwork: 1,
        Story: 0,
        Music: 0,
        Animation: 1,
      },
      tag: {
        General: 'rating:s',
        Mature: 'rating:q',
        Explicit: 'rating:e',
        Extreme: 'rating:e'
      }
    };

    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(`${this.baseURL}/user/home`, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) {
            this.loginStatus = WebsiteStatus.Logged_In;

            // try to get username
            try {
              const matcher = /Logged in as.*"/g;
              const aTags = HTMLParser.getTagsOf(page, 'a');
              if (aTags.length > 0) {
                for (let i = 0; i < aTags.length; i++) {
                  let tag = aTags[i];
                  if (tag.match(matcher)) {
                    this.info.username = tag.match(/Logged in as.*"/g)[0].split(' ')[3].replace('"', '') || null;
                  }
                }
              }
            } catch (e) { /* Do Nothing */ }
          }
          else this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(this.loginStatus);
        });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/post/upload`, { responseType: 'text' })
        .subscribe(uploadFormPage => {
          const uploadForm = new FormData();
          const options = submission.options;

          const tags: string[] = this.formatTags(submission.defaultTags, submission.customTags);
          tags.push(this.getMapping('tag', submission.submissionData.submissionRating));

          //Primary
          uploadForm.set('post[tags]', tags.join(' ').trim());
          uploadForm.set('post[file]', submission.submissionData.submissionFile.getRealFile());
          uploadForm.set('post[rating]', this.getMapping('rating', submission.submissionData.submissionRating));
          uploadForm.set('authenticity_token', HTMLParser.getInputValue(uploadFormPage, 'authenticity_token'));
          uploadForm.set('post[description]', submission.description);
          uploadForm.set('post[source]', '');

          if (options.sourceURL) uploadForm.set('post[source]', options.sourceURL);

          //Ignored properties
          uploadForm.set('post[parent_id]', '');

          this.http.post(`${this.baseURL}/post/create`, uploadForm)
            .subscribe((res: any) => {
              try {
                if (res.success) observer.next(res);
                else observer.error(this.createError(res, submission, res.reason));
              } catch (err) {
                observer.error(this.createError({ res, err }, submission, res.reason));
              }

              observer.complete();
            }, err => {
              observer.error(this.createError(err, submission));
              observer.complete();
            });
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }
}
