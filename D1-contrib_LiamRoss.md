Liam Ross - @LiamRoss on GitHub

    NOTE: the bot wasn't running on Sunday night, so these values 
    are probably outdated. Please use the most recent ones from 
    the 8am run instead.
___________________________________________________________________
Final Test Pass Rate:       79% (42 passing, 11 failing, 0 skipped)
Coverage Rate:              64%

A header with the final test pass rate and coverage rate at the deadline (Monday @ 0800).


CONTRIBUTIONS TO THE PROJECT:

My concrete contributions include performQuery and all of the sub functions. This includes 
at the highest level checking if the query is valid (validQuery), retrieving the data 
(retrieveData), and formatting the JSON response (formatJsonResponse). Naturally each of these
is also a web of helper and sub functions. Of course all is used loosely here, as me and my 
teammate both debugged and wrote patches to this code afterward. 


SIGNIFICANT COMMITS:

My most significant commit, this is where I created the basis for performQuery (the next commit 
    fixes the bug)
    https://github.com/CS310-2017Jan/cpsc310project_team46/commit/fa023b9ef4d95c8d893f6914a3070fd5eee11d94 
My other most significant commit, I built up a decent test suite for my functions 
    https://github.com/CS310-2017Jan/cpsc310project_team46/commit/4f256e62b050929c1860c2d751ad12c671a974f7 
All other commits are smaller, but perhaps more impactful as they fix up issues, I started doing more 
    frequent commits at a certain point, but the above ones show more being done so hey why not link those.

"If you do not have any (or very few) commits, you should explain your concrete contributions. 
    This should be committed before you meet with your TAs in the lab as you will refer to this file 
    in your meeting with them."
        -> I think I have plenty


RETROSPECTIVE:

What went well:
    Our code ran, so that's pretty sweet. I think we collaborated quite well within the group. 
    In general I enjoyed the work and it was a fantastic learning experience, especially given that 
    I had zero async experience (and didn't do deliverable 0 - or did but it didn't run very well, 
    anyways sidetrack). I enjoyed being able to work on performQuery, it was a truly complex function,
    and I think optimizing and refactoring it in the future will be a lot of fun as well. 

What could be improved:
    I think the improvement could be entirely my own. I was extremely busy during the beginning of 
    the sprint, so I ended up cramming towards the end. While it worked out, next sprint I definitely 
    want to establish the work I need to do early, and start getting chunks of it done right away. 
    This way I can avoid having to write all the test cases towards the end, and spend so much time in 
    a panic fixing bugs on the weekend. I think having an early planning session and establishing a 
    spec would be the best plan of action.