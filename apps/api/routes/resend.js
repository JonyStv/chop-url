import {Resend} from 'resend';
import {Router} from 'express';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/verify-email', async (req, res) => {
    const {to, subject, html} = req.body;

    const { data, error } = await resend.emails.send({
        from: 'noreply@stvdev.com',
        to:[to],
        subject,
        html
    });

    if (error) return res.status(400).json({ error: error.message }); 
    res.status(200).json({ message: 'Email sent successfully', data });
});
export { router as resendRouter };