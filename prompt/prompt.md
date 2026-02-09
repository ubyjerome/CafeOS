I want to build a system for managing cyber cafe's this is going - CafeOS
This system is going to be feature rich, client side only with instantdb for database and authentication, cloudinary for media, and then paystack for payment.
Here's what i have in mind; there are going to be "Guests" that is the external peeps which will come to use this service, "Managers" which are the folks who will be managing in a sense of, updating information, setting prices etc... and "Admins" which will be responsble for doing low level stuffs.
Now, Managers are the ones who will be doing most of the work, this includes things like changing the theme of the system, updating the logo etc, they are also responsible for creating services and assigning prices to those services.
Now Admins will be the ones doing the checkins based on the type of service.
Note that since this is a cafe, services can be of different types, Monthly, Daily, Weekly, specific time range or one off.
The way this would work would be, for one off services the users (guests) will just pay straight up and whenever they need access to this service the admins can just maybe request for verification and then can show perharps a payment proof that they have paid for the service say, a valid qr code that the admins can validate, and it will be marked that they have accessed this service.
Now for the other time based service, understand that this cafe is a physical location, i will use Nigerians cyber cafe for example, the individuals can just a particular type and make payment, after the payment is made, if its something that's daily they can visit the cafe to check in, once they check in their timer starts counting down untill when the day ends. once the day ends the system marks the service as completed.
Now, for the weekly ones etc, it follows the same pattern but instead of marking the service as completed it marks as say 1/7 completed etc... you get the idea.
Now the purpose of this is to ensure the system is flexible enough such that it accomodates any kind of service.
Now the core functionality of this system is the admin to guest relationship, that is guest should be able(after logging in at anytime) to see thier payment history and may be print out reciepts, guest should be able to see payments they've subscribed to/paid for etc... guest should be able to see active subscriptions, guest should also be able to manage their guest account which is basically as minimal as changing their name or setting the team to dark mode or light mode, adding a phone number, uploading their account image or maybe adding a gravatar link etc...
Admins should be able to (after logging in) see a guest payment's history/active service, print whatever payment receipt, view current guest subscription, view active/checkedin guest for the day, pause a guest check in, resume a guest check in (pause and resume freezes the countdown for them), admins can ban a guest, so they can't login in the future etc..
Managers can do all what an admin can do and also, block/add new admins, view active admins, print daily, monthly, yearly reports of a guest check in, or financial reports, etc.... managers can view all the guests or all the admins in the system. and also each guest activity, current subscription, past subscription etc just like an admin.
Managers should be able to. Update system global information, this includes the logo, company information, add or remove other managers etc...
When printing a payment reciept, generate a pdf and attach the company logo and company information, just like a normal voucher/reciept.

# Technicalities
Create enviromental variable for:
- instantDB configs
- cloudinary configs
- paystack configs
- primary colour constant (this will be a hex code of the company's branding colour, with this you can use an external package to generate shades that can be applied throughout the platform where neccesseary i think there's an npm package for it, this ensure the colour is not hard coded into the system or into tailwindcss configs, and then this config should support both dark and light variations)


The entire system should be FULLY FUNCTIONAL and responsive on both desktop, mobile and tablets. use dutone icons where neccessary, allow for DM Sans as font (devs can change this if they want at the CSS file), there should be no gradients in the system, border radius should be small, there should be minimal animations (i.e you can show fade in/fade outs but no Scale, i used to see you put scale in buttons on hover or glowly effects, that's terrible avoid it), use the primary colour specified in the env throughout the system for headings etc... where neccessary and use shades generated from an npm package of your choice where also neccessary.
This platform is a straight up SAAS, there should be no landing page, this ensure the admins can deploy it in a subdomain say app.cafeone.com and once their user visits they can just see available services if the sevice is marked public, and prices and can shoose to sign in or sign up to pay for those services.
Paystack implementation will be inline, so we can use the onSuccess or onClose callback to be able to change payment states etc, since there's no server involved for webhooks (you understand).
i know you are wondering, what happens when the user deploys the saas for the first time and nothing is set; this platform is built by ilabs.world.
if the manager has not add a company logo i.e by default the logo should be https://ilabs.world/ilabs-logo.png, by default also the company information should be that of an example company etc...

the default admin credentials can be admin@cafeos.ilabs.world password can then be admin123, do not store plain text password in telnyx, you can store in any obfuscated from since we can't hash passwords in the frontend. but ensure you secure passwords as neccessary etc...
payment history should be stored, used pagination where neccesary, also, use image optimization where neccessary, the ui should be a modern ui, once again prioitize functionality and ui, users should be able to pay for a service, view their service payment information and qr code so the admin can check them in etc...
everything should be fully functional and working.
Don't overuse icons or use icons for illustrations (please don't! you do it all the time), use text also for decorations when neccesary, for interractive elements, you can do some popups, pop untops or whatever it is called that comes from the bottom of the screen and sort of like covers most part of the screen depending on the content (use this only for mobile screens only).
Design should be modern, i don't wanna see no glowly outline or buttons etc...