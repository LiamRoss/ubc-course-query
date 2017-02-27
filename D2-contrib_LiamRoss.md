Liam Ross - @LiamRoss on GitHub
___________________________________________________________________
Final Test Pass Rate:       86% (43 passing, 7 failing, 0 skipped)
Coverage Rate:              85%
Grade:                      87%


CONTRIBUTIONS TO THE PROJECT:

Modifications of performQuery function and subfunctions to accomodate rooms, and functions within addDataset
    to create global array of valid rooms and check against that array.


SIGNIFICANT COMMITS:

Two changes to performQuery, both refactoring of code to accomodate rooms and remove references to courses_
    https://github.com/CS310-2017Jan/cpsc310project_team46/commit/a1b4098a1caed6408bd487e236336f9388e3981c
    https://github.com/CS310-2017Jan/cpsc310project_team46/commit/9c6c662d21b1162909c6e536a3462a70d3d238e2

Most of my time was spent fixing a prominent timeout bug we had, which after two weeks ended up being statements
    which didn't work with the server's version of Node. While much time was spent on this, it did not contribute
    towards this deliverable, and as such my work on this deliverable was a lot less than that of my partner.


RETROSPECTIVE:

What went well:
    The grade for this deliverable is higher than the last, and after the initial refactoring it was much easier
    to incorporate the rooms_ code.

What could be improved:
    The bug fixing took more time than I could have ever imagined, especially for such an insignificant and annoying
    bug (the String.includes() that was in the checking for *string* within queries). Because this bug was so hard
    to find and because it caused our tests to timeout, I spent all of 2 weeks working to fix it. As a result, I ended
    up running out of time to contribute code to this deliverable, leading to many arguments with my team member and 
    a general distain for the project. I take full responsibility obviously, and the bug originated from my code so 
    it's my responsibility. I don't know how to avoid that situation in the future, since I don't think I could have 
    avoided the bug since the command ran fine on our machines, and I needed to fix it before I could begin work so
    that our tests didn't time out. Regardless it was extremely frustrating and stressful for both team members and 
    hopefully will never happen again.